import { addTableRecord, updateTableRecord } from './database';

/**
 * Automation Engine
 * Handles background event-driven workflows.
 */
class AutomationEngine {
  constructor() {
    this.automations = this.loadAutomations();
    this.isInitialized = false;
    this.activeRuns = 0;
    this.MAX_CONCURRENT_RUNS = 10;
    this.EXECUTION_TIMEOUT_MS = 60000; // 1 minute
    this.MAX_LOOP_ITERATIONS = 500;
    this.MAX_RECURSION_DEPTH = 25;
    this.startTimer();
  }

  startTimer() {
    console.log('[AutomationEngine] Starting background timer polling (1 min interval)');
    // Check every minute
    this.timerInterval = setInterval(() => {
      this.checkScheduledAutomations();
    }, 60000);
  }

  refresh() {
    console.log('[AutomationEngine] Refreshing automations from storage...');
    this.automations = this.loadAutomations();
  }

  checkScheduledAutomations() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday

    console.log(`[AutomationEngine] Checking schedules at ${currentHour}:${currentMinute}`);

    const scheduledAutos = this.automations.filter(auto => 
      auto.active && auto.trigger.type === 'TIMER' && auto.trigger.schedule
    );

    scheduledAutos.forEach(auto => {
      const { frequency, time } = auto.trigger.schedule;
      // time format expected: "HH:MM"
      const [schedHour, schedMinute] = (time || "00:00").split(':').map(Number);

      let shouldRun = false;

      if (frequency === 'HOURLY') {
        // Run every hour at the specified minute
        if (currentMinute === schedMinute) shouldRun = true;
      } else if (frequency === 'DAILY') {
        // Run once a day at specified time
        if (currentHour === schedHour && currentMinute === schedMinute) shouldRun = true;
      } else if (frequency === 'WEEKLY') {
        // Run on specified days at specified time
        const days = auto.trigger.schedule.days || []; // [1, 3, 5] for Mon, Wed, Fri
        if (days.includes(currentDay) && currentHour === schedHour && currentMinute === schedMinute) shouldRun = true;
      }

      if (shouldRun) {
        console.log(`[AutomationEngine] Running scheduled automation: ${auto.name}`);
        this.execute(auto, { timestamp: now.toISOString(), source: 'TIMER' });
      }
    });
  }

  loadAutomations() {
    try {
      const saved = localStorage.getItem('mes_automations');
      const data = saved ? JSON.parse(saved) : [];
      // Support both old flat array and new versioned objects
      return data.map(auto => {
        if (auto.published) return auto.published;
        if (auto.nodes) return auto; // Old format
        return null;
      }).filter(Boolean);
    } catch (e) {
      console.error('Failed to load automations:', e);
      return [];
    }
  }

  saveAutomations(automations) {
    this.automations = automations;
    localStorage.setItem('mes_automations', JSON.stringify(automations));
  }

  // Trigger an event
  trigger(eventType, eventData) {
    console.log(`[AutomationEngine] Triggering event: ${eventType}`, eventData);
    
    const relevantAutomations = this.automations.filter(auto => {
      if (!auto.active) return false;
      if (auto.trigger.type !== eventType) return false;
      
      // Additional filtering for MACHINE_TRIGGER (MQTT)
      if (eventType === 'MACHINE_TRIGGER') {
        const { topic, condition } = auto.trigger;
        if (topic && eventData.topic !== topic) return false;
        if (condition && !this.evaluateCondition(condition, eventData.payload)) return false;
      }
      
      return true;
    });

    relevantAutomations.forEach(auto => {
      const depth = (eventData?._depth || 0) + 1;
      if (depth > this.MAX_RECURSION_DEPTH) {
        console.warn(`[AutomationEngine] Recursion limit reached for ${auto.name}. Depth: ${depth}`);
        this.logToDatabase(`Recursion limit reached: ${auto.name} stopped. (Depth: ${depth})`);
        return;
      }
      this.execute(auto, { ...eventData, _depth: depth }).catch(err => {
        console.error(`[AutomationEngine] Error executing ${auto.name}:`, err);
      });
    });
  }

  async execute(automation, eventData) {
    if (this.activeRuns >= this.MAX_CONCURRENT_RUNS) {
      console.warn(`[AutomationEngine] Limit reached! Skipping ${automation.name}. Status: limited`);
      this.logToDatabase(`Limit reached: ${automation.name} skipped. Status: limited`);
      return;
    }

    this.activeRuns++;
    console.log(`[AutomationEngine] Executing automation: ${automation.name} (Active: ${this.activeRuns})`);
    
    try {
      // Use Promise.race to enforce timeout
      await Promise.race([
        this.runLogic(automation, eventData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution Timeout')), this.EXECUTION_TIMEOUT_MS)
        )
      ]);
    } catch (err) {
      console.error(`[AutomationEngine] Execution error in ${automation.name}:`, err.message);
      this.logToDatabase(`Error in ${automation.name}: ${err.message}`);
    } finally {
      this.activeRuns--;
      console.log(`[AutomationEngine] Finished: ${automation.name} (Active: ${this.activeRuns})`);
    }
  }

  async runLogic(automation, eventData) {
    // Support for graph-based execution (ReactFlow structure)
    if (automation.nodes && automation.edges) {
      return this.executeGraph(automation, eventData);
    }

    if (automation.actions) {
      for (const action of automation.actions) {
        await this.runAction(action, eventData);
      }
    }
  }

  logToDatabase(message) {
    addTableRecord('SystemLogs', { 
      message, 
      timestamp: new Date().toISOString(),
      source: 'AutomationEngine'
    }).catch(e => console.error('Failed to log to DB:', e));
  }

  async executeGraph(automation, eventData) {
    // Find the start/event node
    const startNode = automation.nodes.find(n => n.type === 'event' || n.type === 'functionCall' || n.id === 'start');
    if (!startNode) return;

    let currentNode = this.getNextNode(automation, startNode.id);
    
    while (currentNode) {
      console.log(`[AutomationEngine] Executing node: ${currentNode.id} (${currentNode.type})`);
      
      if (currentNode.type === 'action') {
        try {
          await this.runAction(currentNode.data, eventData);
          currentNode = this.getNextNode(automation, currentNode.id);
        } catch (err) {
          console.error(`[AutomationEngine] Action failed:`, err);
          break;
        }
      } else if (currentNode.type === 'decision') {
        const result = this.evaluateCondition(currentNode.data.condition, eventData);
        console.log(`[AutomationEngine] Decision result: ${result}`);
        currentNode = this.getNextNode(automation, currentNode.id, result ? 'yes' : 'no');
      } else if (currentNode.type === 'loop') {
        await this.executeLoop(automation, currentNode, eventData);
        currentNode = this.getNextNode(automation, currentNode.id, 'exit');
      } else {
        break;
      }
    }
  }

  async executeLoop(automation, loopNode, eventData) {
    const listPath = loopNode.data.listPath;
    const list = this.resolveValue(listPath, eventData) || [];
    
    if (!Array.isArray(list)) {
      console.warn(`[AutomationEngine] Loop target at ${listPath} is not an array:`, list);
      return;
    }

    console.log(`[AutomationEngine] Starting loop over ${list.length} items`);
    const iterations = Math.min(list.length, this.MAX_LOOP_ITERATIONS);
    if (list.length > this.MAX_LOOP_ITERATIONS) {
      console.warn(`[AutomationEngine] Loop truncated to ${this.MAX_LOOP_ITERATIONS} items`);
    }

    for (let i = 0; i < iterations; i++) {
      const element = list[i];
      // Create a local context for this iteration, including element and index
      const iterationContext = {
        ...eventData,
        element: element,
        index: i,
        // Also keep references consistent with Tulip docs "position"
        position: i
      };

      console.log(`[AutomationEngine] Loop iteration ${i}:`, element);

      // Execute the "body" of the loop
      let innerNode = this.getNextNode(automation, loopNode.id, 'body');
      
      // We process the body until it hits a node that doesn't exist or we hit the loop node again (implicit boundary)
      while (innerNode && innerNode.id !== loopNode.id) {
        console.log(`[AutomationEngine]   Loop execution node: ${innerNode.id} (${innerNode.type})`);
        
        if (innerNode.type === 'action') {
          try {
            await this.runAction(innerNode.data, iterationContext);
            innerNode = this.getNextNode(automation, innerNode.id);
          } catch (err) {
            console.error(`[AutomationEngine] Inner action failed:`, err);
            break;
          }
        } else if (innerNode.type === 'decision') {
          const result = this.evaluateCondition(innerNode.data.condition, iterationContext);
          innerNode = this.getNextNode(automation, innerNode.id, result ? 'yes' : 'no');
        } else if (innerNode.type === 'loop') {
          // Nested loops supported
          await this.executeLoop(automation, innerNode, iterationContext);
          innerNode = this.getNextNode(automation, innerNode.id, 'exit');
        } else {
          break;
        }
      }
    }

    console.log(`[AutomationEngine] Loop finished`);
  }

  getNextNode(automation, nodeId, sourceHandle) {
    const edge = automation.edges.find(e => 
      e.source === nodeId && (!sourceHandle || e.sourceHandle === sourceHandle)
    );
    if (!edge) return null;
    return automation.nodes.find(n => n.id === edge.target);
  }

  evaluateCondition(condition, eventData) {
    if (!condition) return true; // Default to true if no condition

    const { field, operator, value } = condition;
    
    // Resolve value from eventData if it's a dynamic path (e.g., "record.quantity")
    const actualValue = this.resolveValue(field, eventData);
    const targetValue = value;

    console.log(`[AutomationEngine] Evaluating: ${actualValue} ${operator} ${targetValue}`);

    switch (operator) {
      case '<': return Number(actualValue) < Number(targetValue);
      case '>': return Number(actualValue) > Number(targetValue);
      case '<=': return Number(actualValue) <= Number(targetValue);
      case '>=': return Number(actualValue) >= Number(targetValue);
      case '==': return String(actualValue) === String(targetValue);
      case '!=': return String(actualValue) !== String(targetValue);
      case 'contains': return String(actualValue).includes(String(targetValue));
      default: return false;
    }
  }

  resolveValue(path, data) {
    if (!path || !data) return null;
    return path.split('.').reduce((obj, key) => obj && obj[key], data);
  }

  async runAction(action, eventData) {
    const { tableId, table } = action; // Support both naming variants
    const targetTable = tableId || table;

    switch (action.type) {
      case 'CREATE_RECORD':
      case 'ADD_RECORD':
        console.log(`[AutomationEngine] Creating record in ${targetTable}`, action.data);
        return addTableRecord(targetTable, action.data);
      
      case 'UPDATE_RECORD':
        const recordId = this.resolveValue(action.recordIdPath, eventData) || action.recordId;
        console.log(`[AutomationEngine] Updating record ${recordId} in ${targetTable}`, action.data);
        return updateTableRecord(targetTable, recordId, action.data);

      case 'LOG_MESSAGE':
        console.log(`[AutomationEngine] Log: ${action.message}`);
        return addTableRecord('SystemLogs', { 
          message: action.message, 
          timestamp: new Date().toISOString(),
          source: 'AutomationEngine'
        });

      case 'HTTP_REQUEST':
      case 'CONNECTOR_FUNCTION':
        const url = this.resolveValue(action.urlPath, eventData) || action.url;
        console.log(`[AutomationEngine] Calling HTTP Connector: ${url}`);
        return fetch(url, {
          method: action.method || 'GET',
          headers: action.headers || { 'Content-Type': 'application/json' },
          body: action.method !== 'GET' ? JSON.stringify(action.data || {}) : null
        }).then(res => res.json())
          .then(data => {
            console.log(`[AutomationEngine] Connector success:`, data);
            // After connector finishes, we could potentially trigger a follow-up
            this.trigger('CONNECTOR_TRIGGER', { url, data, status: 'success' });
            return data;
          }).catch(err => {
            console.error(`[AutomationEngine] Connector failed:`, err);
            this.trigger('CONNECTOR_TRIGGER', { url, error: err.message, status: 'error' });
            throw err;
          });

      case 'SEND_NOTIFICATION':
        const recipient = this.resolveValue(action.recipientPath, eventData) || action.recipient;
        const msg = this.resolveValue(action.messagePath, eventData) || action.message;
        console.log(`[AutomationEngine] SEND NOTIFICATION to ${recipient}: ${msg}`);
        // Mock notification: log to system table
        return addTableRecord('SystemLogs', { 
          message: `NOTIFICATION to ${recipient}: ${msg}`, 
          timestamp: new Date().toISOString(),
          source: 'AutomationEngine:Notification'
        });

      case 'AI_SUMMARIZE':
      case 'AI_EXTRACT':
      case 'AI_TRANSLATE':
        const inputText = this.resolveValue(action.inputPath, eventData) || 'No input text found.';
        console.log(`[AutomationEngine] Executing AI Action (${action.type}) on: ${inputText}`);
        
        // Simulation of AI processing
        let aiResult = "";
        await new Promise(r => setTimeout(r, 1000)); // Simulate latency

        if (action.type === 'AI_SUMMARIZE') {
          aiResult = "SUMMARY: " + (inputText.slice(0, 50) + (inputText.length > 50 ? "..." : ""));
        } else if (action.type === 'AI_TRANSLATE') {
          aiResult = `[Translated to ${action.targetLanguage || 'English'}]: ${inputText}`;
        } else if (action.type === 'AI_EXTRACT') {
          aiResult = JSON.stringify({ extracted_data: "Simulated extraction for " + inputText.slice(0, 20) });
        }

        if (action.outputPath) {
          const parts = action.outputPath.split('.');
          if (parts[0] === 'record' && eventData.record) {
             const tableId = eventData.tableId;
             const recordId = eventData.record.id;
             const updateData = { [parts[1]]: aiResult };
             await updateTableRecord(tableId, recordId, updateData);
             console.log(`[AutomationEngine] AI result saved to ${action.outputPath}`);
          }
        }
        return aiResult;

      default:
        console.warn(`[AutomationEngine] Unknown action type: ${action.type}`);
    }
  }
}

const engine = new AutomationEngine();
export default engine;
