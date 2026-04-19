import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import { registerFieldColour } from '@blockly/field-colour';
import { javascriptGenerator } from 'blockly/javascript';
import { Code, X, Sparkles } from 'lucide-react';
import AiLogicAdvisor from './AiLogicAdvisor';

const BLOCK_COLORS = {
    CONTROL: '#A0522D',     // Cokelat
    LOGIC: '#00B295',       // Hijau
    MATH: '#4A90E2',        // Biru
    TEXT: '#D93B8A',        // Ungu
    LISTS: '#FF4081',       // Pink/Magenta
    VARIABLES: '#F57F17',   // Oranye
    PROCEDURES: '#767676',  // Abu-abu
    DICTIONARIES: '#912424',
    COMPONENTS: '#00B295',
    COLORS: '#767676',
    MAVI_TRIGGER: '#10b981',
    MAVI_SCREEN: '#6366f1'
};

const BlocklyEditor = ({
    steps,
    baseComponents: initialBaseComponents = [],
    currentStepId,
    appVariables,
    globalLogic,
    onUpdateGlobalLogic,
    onUpdateStepLogic,
    onCreateWidgetFromAi,
    onClose
}) => {
    const baseComponents = initialBaseComponents;

    const blocklyDiv = useRef(null);
    const workspace = useRef(null);
    const [activeScope, setActiveScope] = useState('STEP'); // 'STEP' or 'GLOBAL'
    const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
    const [isSavingLogic, setIsSavingLogic] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error

    const saveProgressTimerRef = useRef(null);
    const saveResetTimerRef = useRef(null);

    const currentStep = steps.find(s => s.id === currentStepId);

    const parseAddWidgetSpecs = (text) => {
        const specs = [];
        if (!text) return specs;

        const regex = /<add_widget>([\s\S]*?)<\/add_widget>/gi;
        let match;
        while ((match = regex.exec(String(text))) !== null) {
            const raw = String(match[1] || '').trim();
            if (!raw) continue;

            // Preferred format: JSON payload
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    specs.push(parsed);
                    continue;
                }
            } catch (_) { }

            // Fallback format: type=BUTTON,label=Start,text=Start
            const obj = {};
            raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean).forEach((part) => {
                const idx = part.indexOf('=');
                if (idx <= 0) return;
                const k = part.slice(0, idx).trim().toLowerCase();
                const v = part.slice(idx + 1).trim();
                if (!k) return;
                if (k === 'type') obj.type = v;
                else if (k === 'label') obj.label = v;
                else if (k === 'text') obj.text = v;
                else if (k === 'id' || k === 'widget_id') obj.idHint = v;
            });
            if (Object.keys(obj).length > 0) specs.push(obj);
        }

        return specs;
    };

    const parseBlockXmlSnippets = (text) => {
        const snippets = [];
        if (!text) return snippets;

        const source = String(text);
        const wrapped = /<block_xml>([\s\S]*?)<\/block_xml>/gi;
        let match;
        while ((match = wrapped.exec(source)) !== null) {
            const content = String(match[1] || '').trim();
            if (content) snippets.push(content);
        }

        if (snippets.length === 0) {
            if (source.includes('<xml') || source.includes('<block')) {
                snippets.push(source);
            }
        }

        return snippets;
    };

    // 1. Initialize Workspace and Handle Lifecycle
    useEffect(() => {
        if (!blocklyDiv.current) return;

        // Define core custom blocks once
        defineCoreBlocks();
        defineGenerators();

        // Initialize Workspace
        workspace.current = Blockly.inject(blocklyDiv.current, {
            toolbox: { kind: 'categoryToolbox', contents: [] }, // Initially empty, filled by updateToolbox
            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
            trashcan: true,
            zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
            move: { scrollbars: true, drag: true, wheel: true },
            theme: Blockly.Themes.Modern
        });

        return () => {
            if (workspace.current) {
                workspace.current.dispose();
            }
        };
    }, []);

    // 1.1 Category Provider for Procedures
    useEffect(() => {
        if (workspace.current) {
            workspace.current.registerToolboxCategoryCallback('PROCEDURE_AI', (ws) => {
                const xmlList = [];
                // Standard define blocks
                xmlList.push(Blockly.utils.xml.textToDom('<block type="procedures_defnoreturn"><field name="NAME">procedure</field></block>'));
                xmlList.push(Blockly.utils.xml.textToDom('<block type="procedures_defreturn"><field name="NAME">procedure</field></block>'));

                xmlList.push(Blockly.utils.xml.textToDom('<sep gap="24"></sep>'));

                // The Reflection blocks
                xmlList.push(Blockly.utils.xml.textToDom('<block type="procedure_call_dynamic"></block>'));
                xmlList.push(Blockly.utils.xml.textToDom('<block type="procedure_get_name"></block>'));
                xmlList.push(Blockly.utils.xml.textToDom('<block type="procedure_number_of_inputs"></block>'));

                xmlList.push(Blockly.utils.xml.textToDom('<sep gap="24"></sep>'));

                // Standard flyout content (the "call" blocks)
                const proceds = Blockly.Procedures.allProcedures(ws);
                // proceds[0] is no-return, proceds[1] is return
                [...proceds[0], ...proceds[1]].forEach(p => {
                    const name = p[0];
                    const blockType = proceds[0].includes(p) ? 'procedures_callnoreturn' : 'procedures_callreturn';
                    const block = Blockly.utils.xml.textToDom(`<block type="${blockType}"><field name="NAME">${name}</field></block>`);
                    // Add parameters if any
                    const params = p[1];
                    params.forEach((param, i) => {
                        const value = Blockly.utils.xml.textToDom(`<value name="ARG${i}"></value>`);
                        block.appendChild(value);
                    });
                    xmlList.push(block);
                });

                return xmlList;
            });
        }
    }, [workspace.current]);

    // 2. Handle Scope or Step changes (Loading/Saving logic)
    useEffect(() => {
        if (workspace.current) {
            try {
                registerFieldColour();

                // --- MIT App Inventor Localization Overrides ---
                Blockly.Msg['PROCEDURES_DEFNORETURN_TITLE_CONT'] = 'to';
                Blockly.Msg['PROCEDURES_DEFRETURN_TITLE_CONT'] = 'to';
                Blockly.Msg['PROCEDURES_DEFRETURN_RETURN'] = 'result';
                Blockly.Msg['PROCEDURES_CALLNORETURN_TITLE'] = 'call';
                Blockly.Msg['PROCEDURES_CALLRETURN_TITLE'] = 'call';

                // Theme enforced by overriding the block in situ
                if (Blockly.Blocks['procedures_defnoreturn']) Blockly.Blocks['procedures_defnoreturn'].setColour(BLOCK_COLORS.PROCEDURES);
                if (Blockly.Blocks['procedures_defreturn']) Blockly.Blocks['procedures_defreturn'].setColour(BLOCK_COLORS.PROCEDURES);
                if (Blockly.Blocks['procedures_callnoreturn']) Blockly.Blocks['procedures_callnoreturn'].setColour(BLOCK_COLORS.PROCEDURES);
                if (Blockly.Blocks['procedures_callreturn']) Blockly.Blocks['procedures_callreturn'].setColour(BLOCK_COLORS.PROCEDURES);

            } catch (e) { }

            defineCoreBlocks();
            defineGenerators();
            defineDynamicBlocks(currentStep, baseComponents, appVariables);

            const toolboxConfig = getToolbox(steps, appVariables, currentStep, activeScope, baseComponents);
            workspace.current.updateToolbox(toolboxConfig);

            const logicToLoad = activeScope === 'GLOBAL' ? globalLogic : (currentStep?.logic || null);

            Blockly.Events.disable();
            workspace.current.clear();
            if (logicToLoad && logicToLoad.xml) {
                try {
                    const xmlText = logicToLoad.xml;
                    const xml = Blockly.utils.xml.textToDom(xmlText);
                    Blockly.Xml.domToWorkspace(xml, workspace.current);
                } catch (e) {
                    console.error("Failed to load blockly logic:", e);
                }
            }
            Blockly.Events.enable();
        }
    }, [currentStepId, activeScope, steps, appVariables, baseComponents]);

    useEffect(() => {
        return () => {
            if (saveProgressTimerRef.current) clearInterval(saveProgressTimerRef.current);
            if (saveResetTimerRef.current) clearTimeout(saveResetTimerRef.current);
        };
    }, []);

    const defineCoreBlocks = () => {
        const DICT_KEY_CHECKS = ['String', 'Number'];

        try {
            registerFieldColour();
        } catch (e) { }

        // Go To Screen Block
        if (!Blockly.Blocks['go_to_step']) {
            Blockly.Blocks['go_to_step'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("Go to Screen")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return steps.length > 0 ? steps.map(s => [s.title || s.id, s.id]) : [["No screens", "none"]];
                        }), "STEP");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.MAVI_SCREEN);
                }
            };
        }

        // Next Screen Block
        if (!Blockly.Blocks['next_step']) {
            Blockly.Blocks['next_step'] = {
                init: function () {
                    this.appendDummyInput().appendField("Next Screen");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.MAVI_SCREEN);
                }
            };
        }

        // Event Parameter Getter Block
        if (!Blockly.Blocks['get_event_parameter']) {
            Blockly.Blocks['get_event_parameter'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("get")
                        .appendField(new Blockly.FieldTextInput("parameter"), "NAME");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.LOGIC);
                    this.setTooltip("Get a parameter from the current event (e.g. 'x', 'y' for charts, 'latitude' for maps)");
                }
            };
            javascriptGenerator.forBlock['get_event_parameter'] = function (block) {
                const name = block.getFieldValue('NAME');
                return [`context.getEventParameter("${name}")`, javascriptGenerator.ORDER_ATOMIC];
            };
        }

        // Complete App Block
        if (!Blockly.Blocks['complete_app']) {
            Blockly.Blocks['complete_app'] = {
                init: function () {
                    this.appendDummyInput().appendField("Complete App");
                    this.setPreviousStatement(true, null);
                    this.setColour(160);
                }
            };
        }

        // Set Variable Block
        if (!Blockly.Blocks['set_app_variable']) {
            Blockly.Blocks['set_app_variable'] = {
                init: function () {
                    this.appendValueInput("VALUE")
                        .setCheck(null)
                        .appendField("Set variable")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return appVariables.length > 0 ? appVariables.map(v => [v.name, v.id]) : [["No variables", "none"]];
                        }), "VAR")
                        .appendField("to");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(290);
                }
            };
        }

        // Variable Get Block
        if (!Blockly.Blocks['get_app_variable']) {
            Blockly.Blocks['get_app_variable'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("Variable")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return appVariables.length > 0 ? appVariables.map(v => [v.name, v.id]) : [["No variables", "none"]];
                        }), "VAR");
                    this.setOutput(true, null);
                    this.setColour(290);
                }
            }
        }

        // When Variable Changes Block
        if (!Blockly.Blocks['event_variable_changed']) {
            Blockly.Blocks['event_variable_changed'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("When variable")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return appVariables.length > 0 ? appVariables.map(v => [v.name || v.id, v.id]) : [["No variables", "none"]];
                        }), "VAR")
                        .appendField("changes");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("Trigger logic when an application variable is modified.");
                }
            };
        }

        // App Level Events
        if (!Blockly.Blocks['event_app_start']) {
            Blockly.Blocks['event_app_start'] = {
                init: function () {
                    this.appendDummyInput().appendField("When App Starts");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(0);
                }
            };
        }
        if (!Blockly.Blocks['event_step_enter']) {
            Blockly.Blocks['event_step_enter'] = {
                init: function () {
                    this.appendDummyInput().appendField("When Screen is Entered");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(0);
                }
            };
        }
        if (!Blockly.Blocks['event_step_exit']) {
            Blockly.Blocks['event_step_exit'] = {
                init: function () {
                    this.appendDummyInput().appendField("When Screen is Exited");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(0);
                }
            };
        }

        // --- MIT App Inventor Screen (Step) Parity Blocks ---

        // 1. Step Initialize (Event)
        // --- Logic Data Blocks ---
        if (!Blockly.Blocks['get_event_parameter']) {
            Blockly.Blocks['get_event_parameter'] = {
                init: function () {
                    this.appendDummyInput().appendField("get event output");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.LOGIC);
                    this.setTooltip("Get the output value from the current trigger event (e.g. Barcode result, Sensor value).");
                }
            };
        }

        if (!Blockly.Blocks['step_initialize']) {
            Blockly.Blocks['step_initialize'] = {
                init: function () {
                    this.appendDummyInput().appendField("When Step.Initialize");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("The Initialize event is run when the Step starts.");
                    if (this.setHat) this.setHat(true);
                }
            };
        }

        // 2. Step BackPressed (Event)
        if (!Blockly.Blocks['step_back_pressed']) {
            Blockly.Blocks['step_back_pressed'] = {
                init: function () {
                    this.appendDummyInput().appendField("When Step.BackPressed");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("Device back button pressed.");
                    if (this.setHat) this.setHat(true);
                }
            };
        }

        // 3. Step ErrorOccurred (Event)
        if (!Blockly.Blocks['step_error_occurred']) {
            Blockly.Blocks['step_error_occurred'] = {
                init: function () {
                    this.appendDummyInput().appendField("When Step.ErrorOccurred");
                    this.appendStatementInput("STACK").setCheck(null).appendField("do");
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("Event raised when an error occurs.");
                    if (this.setHat) this.setHat(true);
                }
            };
        }

        // 4. Set Step Property
        if (!Blockly.Blocks['set_step_property']) {
            Blockly.Blocks['set_step_property'] = {
                init: function () {
                    const properties = [
                        ['AboutStep', 'aboutInfo'], ['BackgroundColor', 'backgroundColor'],
                        ['BackgroundImage', 'backgroundImage'], ['AlignHorizontal', 'alignHorizontal'],
                        ['AlignVertical', 'alignVertical'], ['Title', 'title'],
                        ['Scrollable', 'isScrollable'], ['ShowStatusBar', 'showStatusBar'],
                        ['TitleVisible', 'titleVisible'], ['StepOrientation', 'orientation'],
                        ['HighContrast', 'highContrast'], ['AccentColor', 'accentColor'],
                        ['PrimaryColor', 'primaryColor'], ['AppName', 'appName']
                    ];
                    this.appendValueInput("VALUE")
                        .setCheck(null)
                        .appendField("set Step")
                        .appendField(new Blockly.FieldDropdown(properties), "PROP")
                        .appendField("to");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                }
            };
        }

        // 5. Get Step Property
        if (!Blockly.Blocks['get_step_property']) {
            Blockly.Blocks['get_step_property'] = {
                init: function () {
                    const properties = [
                        ['AboutStep', 'aboutInfo'], ['BackgroundColor', 'backgroundColor'],
                        ['BackgroundImage', 'backgroundImage'], ['AlignHorizontal', 'alignHorizontal'],
                        ['AlignVertical', 'alignVertical'], ['Title', 'title'],
                        ['Height', 'height'], ['Width', 'width'],
                        ['Platform', 'platform'], ['PlatformVersion', 'platformVersion']
                    ];
                    this.appendDummyInput()
                        .appendField("Step")
                        .appendField(new Blockly.FieldDropdown(properties), "PROP");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                }
            };
        }

        // 6. Step Methods
        if (!Blockly.Blocks['step_ask_permission']) {
            Blockly.Blocks['step_ask_permission'] = {
                init: function () {
                    this.appendValueInput("PERMISSION")
                        .setCheck("String")
                        .appendField("call Step.AskForPermission");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(290);
                }
            };
        }

        if (!Blockly.Blocks['step_hide_keyboard']) {
            Blockly.Blocks['step_hide_keyboard'] = {
                init: function () {
                    this.appendDummyInput().appendField("call Step.HideKeyboard");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(290);
                }
            };
        }
        if (!Blockly.Blocks['dict_get']) {
            Blockly.Blocks['dict_get'] = {
                init: function () {
                    this.appendValueInput("DICT").setCheck('Dictionary').appendField("get value for key");
                    this.appendValueInput("KEY").setCheck(DICT_KEY_CHECKS).appendField("in dictionary");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                    this.setTooltip("Returns the value associated with the key in the dictionary.");
                }
            };
        }
        if (!Blockly.Blocks['dict_set']) {
            Blockly.Blocks['dict_set'] = {
                init: function () {
                    this.appendValueInput("DICT").setCheck('Dictionary').appendField("set value for key");
                    this.appendValueInput("KEY").setCheck(DICT_KEY_CHECKS).appendField("to");
                    this.appendValueInput("VALUE").setCheck(null).appendField("in dictionary");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(345);
                }
            };
        }

        if (!Blockly.Blocks['dict_create']) {
            Blockly.Blocks['dict_create'] = {
                init: function () {
                    this.appendValueInput("PAIRS")
                        .setCheck('Array')
                        .appendField("make dictionary from pairs");
                    this.setOutput(true, 'Dictionary');
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        if (!Blockly.Blocks['dict_pair']) {
            Blockly.Blocks['dict_pair'] = {
                init: function () {
                    this.appendValueInput("KEY")
                        .setCheck(DICT_KEY_CHECKS)
                        .appendField("pair key");
                    this.appendValueInput("VALUE")
                        .setCheck(null)
                        .appendField("value");
                    this.setOutput(true, 'Array');
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        if (!Blockly.Blocks['dict_keys']) {
            Blockly.Blocks['dict_keys'] = {
                init: function () {
                    this.appendValueInput("DICT")
                        .setCheck('Dictionary')
                        .appendField("get keys from dictionary");
                    this.setOutput(true, 'Array');
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        if (!Blockly.Blocks['dict_values']) {
            Blockly.Blocks['dict_values'] = {
                init: function () {
                    this.appendValueInput("DICT")
                        .setCheck('Dictionary')
                        .appendField("get values from dictionary");
                    this.setOutput(true, 'Array');
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        if (!Blockly.Blocks['dict_contains_key']) {
            Blockly.Blocks['dict_contains_key'] = {
                init: function () {
                    this.appendValueInput("DICT")
                        .setCheck('Dictionary')
                        .appendField("dictionary contains key");
                    this.appendValueInput("KEY")
                        .setCheck(DICT_KEY_CHECKS);
                    this.setOutput(true, 'Boolean');
                    this.setInputsInline(true);
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        if (!Blockly.Blocks['dict_remove_key']) {
            Blockly.Blocks['dict_remove_key'] = {
                init: function () {
                    this.appendValueInput("DICT")
                        .setCheck('Dictionary')
                        .appendField("remove key");
                    this.appendValueInput("KEY")
                        .setCheck(DICT_KEY_CHECKS)
                        .appendField("from dictionary");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        if (!Blockly.Blocks['dict_lookup_default']) {
            Blockly.Blocks['dict_lookup_default'] = {
                init: function () {
                    this.appendValueInput("DICT")
                        .setCheck('Dictionary')
                        .appendField("get value for key");
                    this.appendValueInput("KEY")
                        .setCheck(DICT_KEY_CHECKS)
                        .appendField("in dictionary");
                    this.appendValueInput("DEFAULT")
                        .setCheck(null)
                        .appendField("or if not found");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.DICTIONARIES);
                }
            };
        }

        // --- Universal Widget Blocks ---

        // 1. Widget Selector Block
        if (!Blockly.Blocks['widget_selector']) {
            Blockly.Blocks['widget_selector'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField(new Blockly.FieldDropdown(() => {
                            const allComps = [
                                ...(baseComponents || []),
                                ...(currentStep?.components || [])
                            ];
                            if (allComps.length === 0) return [["No widgets", "none"]];
                            return allComps.map(c => [c.name || c.props.label || c.props.text || c.type, c.id]);
                        }), "WIDGET");
                    this.setOutput(true, 'WidgetRef');
                    this.setColour(160);
                    this.setTooltip("Select any widget from the application.");
                }
            };
        }

        // 2. Universal Property Setter
        if (!Blockly.Blocks['set_universal_property']) {
            Blockly.Blocks['set_universal_property'] = {
                init: function () {
                    const properties = [
                        ['Text', 'text'], ['Value', 'value'], ['Visible', 'visible'],
                        ['Enabled', 'enabled'], ['BackgroundColor', 'backgroundColor'],
                        ['TextColor', 'textColor'], ['FontSize', 'fontSize'],
                        ['Checked', 'checked'], ['Picture', 'picture'],
                        ['Elements', 'elements'], ['AlternateText', 'alternateText'],
                        ['Blink', 'isBlinking']
                    ];
                    this.appendValueInput("WIDGET")
                        .setCheck('WidgetRef')
                        .appendField("set");
                    this.appendDummyInput()
                        .appendField(".")
                        .appendField(new Blockly.FieldDropdown(properties), "PROP")
                        .appendField("to");
                    this.appendValueInput("VALUE")
                        .setCheck(null);
                    this.setInputsInline(true);
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("Set a property for any widget reference.");
                }
            };
        }

        // 3. Universal Property Getter
        if (!Blockly.Blocks['get_universal_property']) {
            Blockly.Blocks['get_universal_property'] = {
                init: function () {
                    const properties = [
                        ['Text', 'text'], ['Value', 'value'], ['Visible', 'visible'],
                        ['Enabled', 'enabled'], ['BackgroundColor', 'backgroundColor'],
                        ['TextColor', 'textColor'], ['FontSize', 'fontSize'],
                        ['Checked', 'checked'], ['Picture', 'picture'],
                        ['Elements', 'elements'], ['AlternateText', 'alternateText'],
                        ['Blink', 'isBlinking']
                    ];
                    this.appendValueInput("WIDGET")
                        .setCheck('WidgetRef');
                    this.appendDummyInput()
                        .appendField(".")
                        .appendField(new Blockly.FieldDropdown(properties), "PROP");
                    this.setInputsInline(true);
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("Get a property from any widget reference.");
                }
            };
        }

        // 4. Universal Method Caller
        if (!Blockly.Blocks['call_universal_method']) {
            Blockly.Blocks['call_universal_method'] = {
                init: function () {
                    this.appendValueInput("WIDGET")
                        .setCheck('WidgetRef')
                        .appendField("call");
                    this.appendDummyInput()
                        .appendField(".")
                        .appendField(new Blockly.FieldTextInput('methodName'), 'METHOD');
                    this.appendValueInput('ARGS')
                        .setCheck('Array')
                        .appendField('with args');
                    this.setInputsInline(true);
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip('Call method on any widget reference with argument list.');
                }
            };
        }

        // --- Color Blocks ---
        if (!Blockly.Blocks['color_basic']) {
            Blockly.Blocks['color_basic'] = {
                init: function () {
                    this.jsonInit({
                        "message0": "%1",
                        "args0": [
                            {
                                "type": "field_colour",
                                "name": "COLOR",
                                "colour": "#ff0000"
                            }
                        ],
                        "output": null,
                        "colour": 20,
                        "tooltip": "Basic color block."
                    });
                }
            };
        }

        if (!Blockly.Blocks['color_make']) {
            Blockly.Blocks['color_make'] = {
                init: function () {
                    this.appendValueInput("LIST")
                        .setCheck("Array")
                        .appendField("make color");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.COLORS);
                    this.setTooltip("Make a color from a list of RGB(A) values.");
                }
            };
        }

        if (!Blockly.Blocks['color_split']) {
            Blockly.Blocks['color_split'] = {
                init: function () {
                    this.appendValueInput("COLOR")
                        .setCheck(null)
                        .appendField("split color");
                    this.setOutput(true, "Array");
                    this.setColour(BLOCK_COLORS.COLORS);
                    this.setTooltip("Split a color into its RGB components.");
                }
            };
        }

        // --- MIT App Inventor Variable Blocks ---

        // Global Declaration
        if (!Blockly.Blocks['variables_global_declaration']) {
            Blockly.Blocks['variables_global_declaration'] = {
                init: function () {
                    this.appendValueInput("VALUE")
                        .setCheck(null)
                        .appendField("initialize global")
                        .appendField(new Blockly.FieldTextInput("name"), "NAME")
                        .appendField("to");
                    this.setColour(BLOCK_COLORS.VARIABLES);
                    this.setTooltip("Create a global variable and assign it an initial value.");
                }
            };
        }

        // Universal Get (restyled)
        if (!Blockly.Blocks['variables_get']) {
            Blockly.Blocks['variables_get'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("get")
                        .appendField(new Blockly.FieldDropdown(() => {
                            const vars = appVariables.length > 0 ? appVariables.map(v => [v.name, v.id]) : [["none", "none"]];
                            // Optional: Scan workspace for global declarations? 
                            // For now, stick to appVariables for simplicity.
                            return vars;
                        }), "VAR");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.VARIABLES);
                }
            };
        }

        // Universal Set (restyled)
        if (!Blockly.Blocks['variables_set']) {
            Blockly.Blocks['variables_set'] = {
                init: function () {
                    this.appendValueInput("VALUE")
                        .setCheck(null)
                        .appendField("set")
                        .appendField(new Blockly.FieldDropdown(() => {
                            const vars = appVariables.length > 0 ? appVariables.map(v => [v.name, v.id]) : [["none", "none"]];
                            return vars;
                        }), "VAR")
                        .appendField("to");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.VARIABLES);
                }
            };
        }

        // Local Declaration (Statement/DO)
        if (!Blockly.Blocks['variables_local_declaration_statement']) {
            Blockly.Blocks['variables_local_declaration_statement'] = {
                init: function () {
                    this.appendValueInput("DECL0")
                        .setCheck(null)
                        .appendField("initialize local")
                        .appendField(new Blockly.FieldTextInput("name"), "NAME0")
                        .appendField("to");
                    this.appendStatementInput("STACK")
                        .setCheck(null)
                        .appendField("in do");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.VARIABLES);
                }
            };
        }

        // Local Declaration (Expression/RETURN)
        if (!Blockly.Blocks['variables_local_declaration_expression']) {
            Blockly.Blocks['variables_local_declaration_expression'] = {
                init: function () {
                    this.appendValueInput("DECL0")
                        .setCheck(null)
                        .appendField("initialize local")
                        .appendField(new Blockly.FieldTextInput("name"), "NAME0")
                        .appendField("to");
                    this.appendValueInput("RETURN")
                        .setCheck(null)
                        .appendField("in return");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.VARIABLES);
                }
            };
        }
        // --- MIT App Inventor Control Blocks ---

        // Gold Theme (Hue: 45)

        // 1. If then else (Statement)
        // Note: We use the built-in controls_if but we can customize its fields/labels if needed.
        // However, for visual parity in the toolbox, we'll define a restyled wrapper if needed.

        // 2. If then else (Expression / Ternary)
        if (!Blockly.Blocks['control_choose']) {
            Blockly.Blocks['control_choose'] = {
                init: function () {
                    this.appendValueInput("TEST")
                        .setCheck("Boolean")
                        .appendField("if");
                    this.appendValueInput("THEN")
                        .appendField("then-return");
                    this.appendValueInput("ELSE")
                        .appendField("else-return");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                    this.setInputsInline(false);
                    this.setTooltip("Tests a condition. If true, returns then-return; otherwise returns else-return.");
                }
            };
        }

        // 3. For each number from to by
        if (!Blockly.Blocks['control_for_range']) {
            Blockly.Blocks['control_for_range'] = {
                init: function () {
                    this.appendValueInput("FROM")
                        .setCheck("Number")
                        .appendField("for each")
                        .appendField(new Blockly.FieldTextInput("number"), "VAR")
                        .appendField("from");
                    this.appendValueInput("TO")
                        .setCheck("Number")
                        .appendField("to");
                    this.appendValueInput("BY")
                        .setCheck("Number")
                        .appendField("by");
                    this.appendStatementInput("DO")
                        .appendField("do");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                    this.setInputsInline(true);
                }
            };
        }

        // 4. For each item in list
        if (!Blockly.Blocks['control_for_each']) {
            Blockly.Blocks['control_for_each'] = {
                init: function () {
                    this.appendValueInput("LIST")
                        .setCheck("Array")
                        .appendField("for each")
                        .appendField(new Blockly.FieldTextInput("item"), "VAR")
                        .appendField("in list");
                    this.appendStatementInput("DO")
                        .appendField("do");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 5. For each key with value in dictionary
        if (!Blockly.Blocks['control_for_each_dict']) {
            Blockly.Blocks['control_for_each_dict'] = {
                init: function () {
                    this.appendValueInput("DICT")
                        .setCheck('Dictionary')
                        .appendField("for each")
                        .appendField(new Blockly.FieldTextInput("key"), "KEY")
                        .appendField("with")
                        .appendField(new Blockly.FieldTextInput("value"), "VAL")
                        .appendField("in dictionary");
                    this.appendStatementInput("DO")
                        .appendField("do");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 6. While
        if (!Blockly.Blocks['control_while']) {
            Blockly.Blocks['control_while'] = {
                init: function () {
                    this.appendValueInput("TEST")
                        .setCheck("Boolean")
                        .appendField("while");
                    this.appendStatementInput("DO")
                        .appendField("do");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 7. Do with result
        if (!Blockly.Blocks['control_do_with_result']) {
            Blockly.Blocks['control_do_with_result'] = {
                init: function () {
                    this.appendStatementInput("STACK")
                        .appendField("do");
                    this.appendValueInput("RESULT")
                        .appendField("result");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 8. Evaluate but ignore result
        if (!Blockly.Blocks['control_evaluate_ignore']) {
            Blockly.Blocks['control_evaluate_ignore'] = {
                init: function () {
                    this.appendValueInput("VALUE")
                        .appendField("evaluate but ignore result");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 9. Open another step
        if (!Blockly.Blocks['control_open_step']) {
            Blockly.Blocks['control_open_step'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("open another step")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return steps.length > 0 ? steps.map(s => [s.title || s.id, s.id]) : [["No steps", "none"]];
                        }), "STEP");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 10. Open another step with value
        if (!Blockly.Blocks['control_open_step_with_value']) {
            Blockly.Blocks['control_open_step_with_value'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("open another step")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return steps.length > 0 ? steps.map(s => [s.title || s.id, s.id]) : [["No steps", "none"]];
                        }), "STEP");
                    this.appendValueInput("VALUE")
                        .appendField("with start value");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 11. Get start value
        if (!Blockly.Blocks['control_get_start_value']) {
            Blockly.Blocks['control_get_start_value'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("get start value");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 12. Close Screen
        if (!Blockly.Blocks['control_close_step']) {
            Blockly.Blocks['control_close_step'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("close screen");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 13. Close screen with value
        if (!Blockly.Blocks['control_close_step_with_value']) {
            Blockly.Blocks['control_close_step_with_value'] = {
                init: function () {
                    this.appendValueInput("RESULT")
                        .appendField("close screen with value");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 14. Close application
        if (!Blockly.Blocks['control_close_app']) {
            Blockly.Blocks['control_close_app'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("close application");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // 15. Break
        if (!Blockly.Blocks['control_break']) {
            Blockly.Blocks['control_break'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("break");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.CONTROL);
                }
            };
        }

        // --- MIT App Inventor Procedure Reflection Blocks ---

        if (!Blockly.Blocks['procedure_call_dynamic']) {
            Blockly.Blocks['procedure_call_dynamic'] = {
                init: function () {
                    this.appendValueInput("NAME")
                        .setCheck("String")
                        .appendField("call procedure");
                    this.appendValueInput("PARAMS")
                        .setCheck("Array")
                        .appendField("input list");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.PROCEDURES);
                    this.setTooltip("Call a procedure by its name with a list of arguments.");
                }
            };
        }

        if (!Blockly.Blocks['procedure_get_name']) {
            Blockly.Blocks['procedure_get_name'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("get procedure")
                        .appendField(new Blockly.FieldDropdown(() => {
                            const proceds = Blockly.Procedures.allProcedures(workspace.current);
                            const names = [...proceds[0], ...proceds[1]].map(p => [p[0], p[0]]);
                            return names.length > 0 ? names : [["none", "none"]];
                        }), "NAME")
                        .appendField("name");
                    this.setOutput(true, "String");
                    this.setColour(BLOCK_COLORS.PROCEDURES);
                }
            };
        }

        if (!Blockly.Blocks['procedure_number_of_inputs']) {
            Blockly.Blocks['procedure_number_of_inputs'] = {
                init: function () {
                    this.appendValueInput("NAME")
                        .setCheck("String")
                        .appendField("number of inputs");
                    this.appendDummyInput().appendField("procedure");
                    this.setOutput(true, "Number");
                    this.setColour(BLOCK_COLORS.PROCEDURES);
                }
            };
        }

        // --- Tulip-style Trigger blocks ---

        // 1. Device Trigger
        if (!Blockly.Blocks['trigger_when_device']) {
            Blockly.Blocks['trigger_when_device'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("When device")
                        .appendField(new Blockly.FieldTextInput("Barcode Scanner"), "DEVICE")
                        .appendField("outputs at")
                        .appendField(new Blockly.FieldDropdown([["this station", "CURRENT"], ["all stations", "ALL"]]), "STATION");
                    this.appendStatementInput("STACK")
                        .appendField("then");
                    this.setColour(BLOCK_COLORS.MAVI_TRIGGER);
                    this.setTooltip("Trigger logic when a device outputs data at a station.");
                    if (this.setHat) this.setHat(true);
                }
            };
        }

        // 2. Timer Trigger
        if (!Blockly.Blocks['trigger_when_timer']) {
            Blockly.Blocks['trigger_when_timer'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("When regular time interval")
                        .appendField(new Blockly.FieldNumber(5, 1), "SECONDS")
                        .appendField("seconds then");
                    this.appendStatementInput("STACK");
                    this.setColour(BLOCK_COLORS.MAVI_TRIGGER);
                    if (this.setHat) this.setHat(true);
                }
            };
        }

        // 3. Connector Function Call
        if (!Blockly.Blocks['action_run_connector']) {
            Blockly.Blocks['action_run_connector'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("Run Connector Function")
                        .appendField(new Blockly.FieldTextInput("Connector Name"), "CONNECTOR")
                        .appendField("/")
                        .appendField(new Blockly.FieldTextInput("Function Name"), "FUNCTION");
                    this.appendValueInput("PARAMS")
                        .setCheck("Array")
                        .setAlign(Blockly.inputs.Align.RIGHT)
                        .appendField("with inputs");
                    this.appendDummyInput()
                        .setAlign(Blockly.inputs.Align.RIGHT)
                        .appendField("and save result as Variable")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return appVariables.length > 0 ? appVariables.map(v => [v.name, v.id]) : [["none", "none"]];
                        }), "VAR");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip("Call an external API or Database and store the result.");
                }
            };
        }

        // 4. Show Error (Red Alert)
        if (!Blockly.Blocks['action_show_error']) {
            Blockly.Blocks['action_show_error'] = {
                init: function () {
                    this.appendValueInput("MESSAGE")
                        .setCheck("String")
                        .appendField("Show Error");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.DICTIONARIES); // Using Maroon for Error/Alert sounds okay
                    this.setTooltip("Display a red error message to the operator.");
                }
            };
        }

        // 5. Send Alert
        if (!Blockly.Blocks['action_send_alert']) {
            Blockly.Blocks['action_send_alert'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("Send Alert")
                        .appendField(new Blockly.FieldDropdown([["Email", "EMAIL"], ["SMS", "SMS"]]), "TYPE")
                        .appendField("to");
                    this.appendValueInput("RECIPIENT")
                        .setCheck("String");
                    this.appendValueInput("MESSAGE")
                        .setCheck("String")
                        .appendField("message");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setInputsInline(true);
                }
            };
        }

        // 6. Transitions
        if (!Blockly.Blocks['transition_go_to_step']) {
            Blockly.Blocks['transition_go_to_step'] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("Go To Step")
                        .appendField(new Blockly.FieldDropdown(() => {
                            return steps.length > 0 ? steps.map(s => [s.title || s.id, s.id]) : [["No steps", "none"]];
                        }), "STEP");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.MAVI_SCREEN);
                }
            };
        }

        if (!Blockly.Blocks['transition_next_step']) {
            Blockly.Blocks['transition_next_step'] = {
                init: function () {
                    this.appendDummyInput().appendField("Go To Next Step");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.MAVI_SCREEN);
                }
            };
        }

        if (!Blockly.Blocks['transition_complete_app']) {
            Blockly.Blocks['transition_complete_app'] = {
                init: function () {
                    this.appendDummyInput().appendField("Complete App");
                    this.setPreviousStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                }
            };
        }

    };

    // 1.5 Define JavaScript Generators for Runtime
    const defineGenerators = () => {
        javascriptGenerator.forBlock['go_to_step'] = function (block) {
            const stepId = block.getFieldValue('STEP');
            return `context.goToStep("${stepId}");\n`;
        };

        javascriptGenerator.forBlock['next_step'] = function (block) {
            return `context.nextStep();\n`;
        };

        javascriptGenerator.forBlock['complete_app'] = function (block) {
            return `context.completeApp();\n`;
        };

        javascriptGenerator.forBlock['set_app_variable'] = function (block) {
            const varId = block.getFieldValue('VAR');
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.setVariable("${varId}", ${value});\n`;
        };

        javascriptGenerator.forBlock['get_event_parameter'] = function (block) {
            return [`context.getEventParameter()`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['get_app_variable'] = function (block) {
            const varId = block.getFieldValue('VAR');
            return [`context.getVariable("${varId}")`, javascriptGenerator.ORDER_ATOMIC];
        };

        // --- Variable Generators ---

        javascriptGenerator.forBlock['variables_global_declaration'] = function (block) {
            const name = block.getFieldValue('NAME');
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.setGlobalVariable("${name}", ${value});\n`;
        };

        javascriptGenerator.forBlock['variables_get'] = function (block) {
            const varId = block.getFieldValue('VAR');
            return [`context.getVariable("${varId}")`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['variables_set'] = function (block) {
            const varId = block.getFieldValue('VAR');
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.setVariable("${varId}", ${value});\n`;
        };

        javascriptGenerator.forBlock['variables_local_declaration_statement'] = function (block) {
            const name = block.getFieldValue('NAME0');
            const initValue = javascriptGenerator.valueToCode(block, 'DECL0', javascriptGenerator.ORDER_ATOMIC) || 'null';
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `(() => {\n  let ${name} = ${initValue};\n${branch}})();\n`;
        };

        javascriptGenerator.forBlock['variables_local_declaration_expression'] = function (block) {
            const name = block.getFieldValue('NAME0');
            const initValue = javascriptGenerator.valueToCode(block, 'DECL0', javascriptGenerator.ORDER_ATOMIC) || 'null';
            const returnValue = javascriptGenerator.valueToCode(block, 'RETURN', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return [`(() => {\n  let ${name} = ${initValue};\n  return ${returnValue};\n})()`, javascriptGenerator.ORDER_ATOMIC];
        };

        // --- Control Generators ---

        javascriptGenerator.forBlock['control_choose'] = function (block) {
            const test = javascriptGenerator.valueToCode(block, 'TEST', javascriptGenerator.ORDER_ATOMIC) || 'false';
            const thenVal = javascriptGenerator.valueToCode(block, 'THEN', javascriptGenerator.ORDER_ATOMIC) || 'null';
            const elseVal = javascriptGenerator.valueToCode(block, 'ELSE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return [`(${test} ? ${thenVal} : ${elseVal})`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['control_for_range'] = function (block) {
            const varName = block.getFieldValue('VAR');
            const from = javascriptGenerator.valueToCode(block, 'FROM', javascriptGenerator.ORDER_ATOMIC) || '0';
            const to = javascriptGenerator.valueToCode(block, 'TO', javascriptGenerator.ORDER_ATOMIC) || '0';
            const by = javascriptGenerator.valueToCode(block, 'BY', javascriptGenerator.ORDER_ATOMIC) || '1';
            const branch = javascriptGenerator.statementToCode(block, 'DO');
            return `for (let ${varName} = ${from}; ${varName} <= ${to}; ${varName} += ${by}) {\n${branch}}\n`;
        };

        javascriptGenerator.forBlock['control_for_each'] = function (block) {
            const varName = block.getFieldValue('VAR');
            const list = javascriptGenerator.valueToCode(block, 'LIST', javascriptGenerator.ORDER_ATOMIC) || '[]';
            const branch = javascriptGenerator.statementToCode(block, 'DO');
            return `for (let ${varName} of ${list}) {\n${branch}}\n`;
        };

        javascriptGenerator.forBlock['control_for_each_dict'] = function (block) {
            const keyName = block.getFieldValue('KEY');
            const valName = block.getFieldValue('VAL');
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            const branch = javascriptGenerator.statementToCode(block, 'DO');
            return `for (let [${keyName}, ${valName}] of Object.entries(${dict})) {\n${branch}}\n`;
        };

        javascriptGenerator.forBlock['control_while'] = function (block) {
            const test = javascriptGenerator.valueToCode(block, 'TEST', javascriptGenerator.ORDER_ATOMIC) || 'false';
            const branch = javascriptGenerator.statementToCode(block, 'DO');
            return `while (${test}) {\n${branch}}\n`;
        };

        javascriptGenerator.forBlock['control_do_with_result'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            const result = javascriptGenerator.valueToCode(block, 'RESULT', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return [`(() => {\n${branch}  return ${result};\n})()`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['control_evaluate_ignore'] = function (block) {
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `${value};\n`;
        };

        javascriptGenerator.forBlock['control_open_step'] = function (block) {
            const stepId = block.getFieldValue('STEP');
            return `context.goToStep("${stepId}");\n`;
        };

        javascriptGenerator.forBlock['control_open_step_with_value'] = function (block) {
            const stepId = block.getFieldValue('STEP');
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.goToStep("${stepId}", ${value});\n`;
        };

        javascriptGenerator.forBlock['control_get_start_value'] = function (block) {
            return [`context.getStartValue()`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['control_close_step'] = function (block) {
            return `context.closeStep();\n`;
        };

        javascriptGenerator.forBlock['control_close_step_with_value'] = function (block) {
            const result = javascriptGenerator.valueToCode(block, 'RESULT', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.closeStep(${result});\n`;
        };

        javascriptGenerator.forBlock['control_close_app'] = function (block) {
            return `context.closeApplication();\n`;
        };

        javascriptGenerator.forBlock['control_break'] = function (block) {
            return `break;\n`;
        };

        javascriptGenerator.forBlock['procedure_call_dynamic'] = function (block) {
            const name = javascriptGenerator.valueToCode(block, 'NAME', javascriptGenerator.ORDER_ATOMIC) || '""';
            const params = javascriptGenerator.valueToCode(block, 'PARAMS', javascriptGenerator.ORDER_ATOMIC) || '[]';
            return `context.callGenericProcedure(${name}, ${params});\n`;
        };

        javascriptGenerator.forBlock['procedure_get_name'] = function (block) {
            const name = block.getFieldValue('NAME');
            return [`"${name}"`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['procedure_number_of_inputs'] = function (block) {
            const name = javascriptGenerator.valueToCode(block, 'NAME', javascriptGenerator.ORDER_ATOMIC) || '""';
            return [`context.getProcedureArgumentCount(${name})`, javascriptGenerator.ORDER_ATOMIC];
        };

        // --- Tulip-style Trigger Generators ---

        javascriptGenerator.forBlock['trigger_when_device'] = function (block) {
            const device = block.getFieldValue('DEVICE');
            const station = block.getFieldValue('STATION');
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: DEVICE_OUTPUT:${device}:${station}\n${branch}`;
        };

        javascriptGenerator.forBlock['trigger_when_timer'] = function (block) {
            const seconds = block.getFieldValue('SECONDS');
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: TIMER:${seconds}\n${branch}`;
        };

        javascriptGenerator.forBlock['action_run_connector'] = function (block) {
            const connector = block.getFieldValue('CONNECTOR');
            const func = block.getFieldValue('FUNCTION');
            const varId = block.getFieldValue('VAR');
            const params = javascriptGenerator.valueToCode(block, 'PARAMS', javascriptGenerator.ORDER_ATOMIC) || '[]';

            return `const result = await context.runConnector("${connector}", "${func}", ${params});\ncontext.setVariable("${varId}", result);\n`;
        };

        javascriptGenerator.forBlock['action_show_error'] = function (block) {
            const message = javascriptGenerator.valueToCode(block, 'MESSAGE', javascriptGenerator.ORDER_ATOMIC) || '""';
            return `context.showError(${message});\n`;
        };

        javascriptGenerator.forBlock['action_send_alert'] = function (block) {
            const type = block.getFieldValue('TYPE');
            const recipient = javascriptGenerator.valueToCode(block, 'RECIPIENT', javascriptGenerator.ORDER_ATOMIC) || '""';
            const message = javascriptGenerator.valueToCode(block, 'MESSAGE', javascriptGenerator.ORDER_ATOMIC) || '""';
            return `context.sendAlert("${type}", ${recipient}, ${message});\n`;
        };

        javascriptGenerator.forBlock['transition_go_to_step'] = function (block) {
            const stepId = block.getFieldValue('STEP');
            return `context.goToStep("${stepId}");\n`;
        };

        javascriptGenerator.forBlock['transition_next_step'] = function (block) {
            return `context.nextStep();\n`;
        };

        javascriptGenerator.forBlock['transition_complete_app'] = function (block) {
            return `context.completeApp();\n`;
        };

        javascriptGenerator.forBlock['event_variable_changed'] = function (block) {
            const varId = block.getFieldValue('VAR');
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: VARIABLE_CHANGED:${varId}\n${branch}`;
        };

        javascriptGenerator.forBlock['event_app_start'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: ON_APP_START\n${branch}`;
        };
        javascriptGenerator.forBlock['event_step_enter'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: ON_STEP_ENTER\n${branch}`;
        };
        javascriptGenerator.forBlock['event_step_exit'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: ON_STEP_EXIT\n${branch}`;
        };

        javascriptGenerator.forBlock['step_initialize'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: ON_STEP_INITIALIZE\n${branch}`;
        };

        javascriptGenerator.forBlock['step_back_pressed'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: ON_BACK_PRESSED\n${branch}`;
        };

        javascriptGenerator.forBlock['step_error_occurred'] = function (block) {
            const branch = javascriptGenerator.statementToCode(block, 'STACK');
            return `// TRIGGER: ON_ERROR\n${branch}`;
        };

        javascriptGenerator.forBlock['set_step_property'] = function (block) {
            const prop = block.getFieldValue('PROP');
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.setStepProperty("${prop}", ${value});\n`;
        };

        javascriptGenerator.forBlock['get_step_property'] = function (block) {
            const prop = block.getFieldValue('PROP');
            return [`context.getStepProperty("${prop}")`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['step_ask_permission'] = function (block) {
            const permission = javascriptGenerator.valueToCode(block, 'PERMISSION', javascriptGenerator.ORDER_ATOMIC) || '""';
            return `context.askForPermission(${permission});\n`;
        };

        javascriptGenerator.forBlock['step_hide_keyboard'] = function (block) {
            return `context.hideKeyboard();\n`;
        };

        javascriptGenerator.forBlock['dict_get'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            const key = javascriptGenerator.valueToCode(block, 'KEY', javascriptGenerator.ORDER_ATOMIC) || '""';
            return [`(${dict})[${key}]`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['dict_set'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            const key = javascriptGenerator.valueToCode(block, 'KEY', javascriptGenerator.ORDER_ATOMIC) || '""';
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `(${dict})[${key}] = ${value};\n`;
        };
        javascriptGenerator.forBlock['dict_pair'] = function (block) {
            const key = javascriptGenerator.valueToCode(block, 'KEY', javascriptGenerator.ORDER_ATOMIC) || '""';
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return [`[${key}, ${value}]`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['dict_create'] = function (block) {
            const pairs = javascriptGenerator.valueToCode(block, 'PAIRS', javascriptGenerator.ORDER_ATOMIC) || '[]';
            return [`Object.fromEntries(${pairs})`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['dict_keys'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            return [`Object.keys(${dict} ?? {})`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['dict_values'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            return [`Object.values(${dict} ?? {})`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['dict_contains_key'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            const key = javascriptGenerator.valueToCode(block, 'KEY', javascriptGenerator.ORDER_ATOMIC) || '""';
            return [`Object.prototype.hasOwnProperty.call((${dict} ?? {}), ${key})`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['dict_remove_key'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            const key = javascriptGenerator.valueToCode(block, 'KEY', javascriptGenerator.ORDER_ATOMIC) || '""';
            return `delete (${dict})[${key}];\n`;
        };
        javascriptGenerator.forBlock['dict_lookup_default'] = function (block) {
            const dict = javascriptGenerator.valueToCode(block, 'DICT', javascriptGenerator.ORDER_ATOMIC) || '{}';
            const key = javascriptGenerator.valueToCode(block, 'KEY', javascriptGenerator.ORDER_ATOMIC) || '""';
            const fallback = javascriptGenerator.valueToCode(block, 'DEFAULT', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return [`Object.prototype.hasOwnProperty.call((${dict} ?? {}), ${key}) ? (${dict})[${key}] : ${fallback}`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['widget_selector'] = function (block) {
            const widgetId = block.getFieldValue('WIDGET');
            return [`"${widgetId}"`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['set_universal_property'] = function (block) {
            const compId = javascriptGenerator.valueToCode(block, 'WIDGET', javascriptGenerator.ORDER_ATOMIC) || 'null';
            const prop = block.getFieldValue('PROP');
            const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
            return `context.setWidgetProperty(${compId}, "${prop}", ${value});\n`;
        };

        javascriptGenerator.forBlock['get_universal_property'] = function (block) {
            const compId = javascriptGenerator.valueToCode(block, 'WIDGET', javascriptGenerator.ORDER_ATOMIC) || 'null';
            const prop = block.getFieldValue('PROP');
            return [`context.getWidgetProperty(${compId}, "${prop}")`, javascriptGenerator.ORDER_ATOMIC];
        };
        javascriptGenerator.forBlock['call_universal_method'] = function (block) {
            const compId = javascriptGenerator.valueToCode(block, 'WIDGET', javascriptGenerator.ORDER_ATOMIC) || 'null';
            const method = (block.getFieldValue('METHOD') || '').trim();
            const args = javascriptGenerator.valueToCode(block, 'ARGS', javascriptGenerator.ORDER_ATOMIC) || '[]';
            return `context.callWidgetMethod(${compId}, "${method}", ${args});\n`;
        };

        // Color Generators
        javascriptGenerator.forBlock['color_basic'] = function (block) {
            const color = block.getFieldValue('COLOR');
            return [`"${color}"`, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['color_make'] = function (block) {
            const list = javascriptGenerator.valueToCode(block, 'LIST', javascriptGenerator.ORDER_ATOMIC) || '[]';
            const code = `(() => {
            const l = ${list};
            const r = l[0] || 0;
            const g = l[1] || 0;
            const b = l[2] || 0;
            const a = l.length > 3 ? (l[3] / 100) : 1.0;
            return "rgba(" + r + "," + g + "," + b + "," + a + ")";
        })()`;
            return [code, javascriptGenerator.ORDER_ATOMIC];
        };

        javascriptGenerator.forBlock['color_split'] = function (block) {
            const color = javascriptGenerator.valueToCode(block, 'COLOR', javascriptGenerator.ORDER_ATOMIC) || '"#000000"';
            const code = `(() => {
            const c = ${color};
            if (!c) return [0,0,0,100];
            // Simple hex parsing or rgba parsing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = c;
            const computed = ctx.fillStyle; // returns #rrggbb or rgba()
            
            // Temporary div to get computed color
            const div = document.createElement('div');
            div.style.color = c;
            document.body.appendChild(div);
            const rgb = window.getComputedStyle(div).color;
            document.body.removeChild(div);
            
            const match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*(\\d+(?:\\.\\d+)?))?\\)/);
            if (match) {
                return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4] ? Math.round(parseFloat(match[4]) * 100) : 100];
            }
            return [0,0,0,100];
        })()`;
            return [code, javascriptGenerator.ORDER_ATOMIC];
        };
    };

    const defineDynamicBlocks = (step, baseComponents = [], variables) => {
        const allComponents = [
            ...(baseComponents || []),
            ...(step?.components || [])
        ];

        allComponents.forEach(comp => {
            if (!comp || !comp.id) return;
            const label = comp.name || comp.props.label || comp.props.text || comp.type;


            const eventTypes = getEventTypesForComponent(comp.type);

            eventTypes.forEach(evt => {
                const triggerBlockName = `event_widget_${comp.id}_${evt.id}`;
                Blockly.Blocks[triggerBlockName] = {
                    init: function () {
                        this.appendDummyInput().appendField(`When ${label} ${evt.label}`);
                        const args = evt.args || [];
                        if (args.length > 0) {
                            this.appendDummyInput().appendField(`(${args.join(', ')})`).setAlign(Blockly.inputs.Align.RIGHT);
                        }
                        this.appendStatementInput("STACK").setCheck(null).appendField("do");
                        this.setColour(BLOCK_COLORS.COMPONENTS);
                        this.setTooltip(`Triggered when ${label} ${evt.label}`);
                        this.setInputsInline(false);
                        // Hat styling
                        if (this.setHat) this.setHat(true);
                    }
                };
                javascriptGenerator.forBlock[triggerBlockName] = function (block) {
                    const branch = javascriptGenerator.statementToCode(block, 'STACK');
                    return `// TRIGGER: WIDGET_EVENT:${comp.id}:${evt.id}\n${branch}`;
                };
            });

            // 2. Set Property Block
            const setterBlockName = `setter_widget_${comp.id}`;
            Blockly.Blocks[setterBlockName] = {
                init: function () {
                    this.appendValueInput("VALUE")
                        .setCheck(null)
                        .appendField(`Set ${label}'s`)
                        .appendField(new Blockly.FieldDropdown(getComponentProperties(comp.type)), "PROP")
                        .appendField("to");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                }
            };
            javascriptGenerator.forBlock[setterBlockName] = function (block) {
                const prop = block.getFieldValue('PROP');
                const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || 'null';
                return `context.setWidgetProperty("${comp.id}", "${prop}", ${value});\n`;
            };

            // 3. Get Property Block
            const getterBlockName = `getter_widget_${comp.id}`;
            Blockly.Blocks[getterBlockName] = {
                init: function () {
                    this.appendDummyInput()
                        .appendField("get")
                        .appendField(`${label}'s`)
                        .appendField(new Blockly.FieldDropdown(getComponentProperties(comp.type)), "PROP");
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip(`Get a property value from ${label}`);
                }
            };
            javascriptGenerator.forBlock[getterBlockName] = function (block) {
                const prop = block.getFieldValue('PROP');
                return [`context.getWidgetProperty("${comp.id}", "${prop}")`, javascriptGenerator.ORDER_ATOMIC];
            };

            // 4. Method Blocks
            const methods = getMethodsForComponent(comp.type);
            methods.forEach(method => {
                const methodBlockName = `method_widget_${comp.id}_${method.id}`;
                Blockly.Blocks[methodBlockName] = {
                    init: function () {
                        this.appendDummyInput()
                            .appendField(`call ${label}.${method.label}`);

                        const args = method.args || [];
                        args.forEach(arg => {
                            this.appendValueInput(arg.toUpperCase())
                                .setCheck(null)
                                .setAlign(Blockly.inputs.Align.RIGHT)
                                .appendField(arg);
                        });

                        this.setPreviousStatement(true, null);
                        this.setNextStatement(true, null);
                        this.setColour(BLOCK_COLORS.COMPONENTS);
                        this.setTooltip(`Call method ${method.label} on ${label}`);
                    }
                };
                javascriptGenerator.forBlock[methodBlockName] = function (block) {
                    const args = (method.args || []).map(arg =>
                        javascriptGenerator.valueToCode(block, arg.toUpperCase(), javascriptGenerator.ORDER_ATOMIC) || 'null'
                    );
                    return `context.callWidgetMethod("${comp.id}", "${method.id}", [${args.join(', ')}]);\n`;
                };
            });

            // 5. Instance Block (Shortcut)
            const instanceBlockName = `instance_widget_${comp.id}`;
            Blockly.Blocks[instanceBlockName] = {
                init: function () {
                    this.appendDummyInput().appendField(label);
                    this.setOutput(true, null);
                    this.setColour(BLOCK_COLORS.COMPONENTS);
                    this.setTooltip(`Reference to ${label}`);
                }
            };
            javascriptGenerator.forBlock[instanceBlockName] = function (block) {
                return [`"${comp.id}"`, javascriptGenerator.ORDER_ATOMIC];
            };
        });
    };

    const getEventTypesForComponent = (type) => {
        if (type === 'BUTTON') {
            return [
                { id: 'Click', label: 'Click' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LongClick', label: 'LongClick' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (['ICON_BUTTON', 'COMPLETE_BUTTON', 'MENU'].includes(type)) {
            return [{ id: 'ON_CLICK', label: 'is Clicked' }];
        }
        if (['BARCODE', 'CAMERA_SCANNER', 'VISION_DETECTOR'].includes(type)) {
            return [{ id: 'ON_CHANGE', label: 'receives Input' }];
        }
        if (['NUMBER_INPUT', 'RADIO_GROUP', 'PASSWORD_TEXT'].includes(type)) {
            return [
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TextChanged', label: 'TextChanged' },
                { id: 'ON_CHANGE', label: 'Value is Changed' } // Legacy
            ];
        }

        // --- Media Events ---
        if (type === 'CAMCORDER') return [{ id: 'AfterRecording', label: 'AfterRecording', args: ['clip'] }];
        if (['CAMERA', 'CAMERA_CAPTURE'].includes(type)) return [{ id: 'AfterPicture', label: 'AfterPicture', args: ['image'] }];
        if (['FILE_PICKER', 'IMAGE_PICKER'].includes(type)) {
            return [
                { id: 'AfterPicking', label: 'AfterPicking' },
                { id: 'BeforePicking', label: 'BeforePicking' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (type === 'PLAYER') {
            return [{ id: 'Completed', label: 'Completed' }, { id: 'OtherPlayerStarted', label: 'OtherPlayerStarted' }];
        }
        if (type === 'SOUND_RECORDER') {
            return [{ id: 'AfterSoundRecorded', label: 'AfterSoundRecorded', args: ['sound'] }, { id: 'StartedRecording', label: 'StartedRecording' }, { id: 'StoppedRecording', label: 'StoppedRecording' }];
        }
        if (type === 'SPEECH_RECOGNIZER') {
            return [{ id: 'AfterGettingText', label: 'AfterGettingText', args: ['result', 'partial'] }, { id: 'BeforeGettingText', label: 'BeforeGettingText' }];
        }
        if (type === 'TEXT_TO_SPEECH') {
            return [{ id: 'AfterSpeaking', label: 'AfterSpeaking', args: ['result'] }, { id: 'BeforeSpeaking', label: 'BeforeSpeaking' }];
        }
        if (type === 'VIDEO_PLAYER') return [{ id: 'Completed', label: 'Completed' }];
        // --- End Media Events ---

        // --- Sensor Events ---
        if (type === 'ACCELEROMETER') return [{ id: 'AccelerationChanged', label: 'AccelerationChanged', args: ['xAccel', 'yAccel', 'zAccel'] }, { id: 'Shaking', label: 'Shaking' }];
        if (type === 'BARCODE_SCANNER') return [{ id: 'AfterScan', label: 'AfterScan', args: ['result'] }];
        if (type === 'BAROMETER') return [{ id: 'AirPressureChanged', label: 'AirPressureChanged', args: ['pressure'] }];
        if (type === 'CLOCK') return [{ id: 'Timer', label: 'Timer' }];
        if (type === 'GYROSCOPE_SENSOR') return [{ id: 'GyroscopeChanged', label: 'GyroscopeChanged', args: ['xAngularVelocity', 'yAngularVelocity', 'zAngularVelocity', 'timestamp'] }];
        if (type === 'HYGROMETER') return [{ id: 'HumidityChanged', label: 'HumidityChanged', args: ['humidity'] }];
        if (type === 'LIGHT_SENSOR') return [{ id: 'LightChanged', label: 'LightChanged', args: ['lux'] }];
        if (type === 'LOCATION_SENSOR') return [{ id: 'GotAddress', label: 'GotAddress', args: ['address'] }, { id: 'GotLocationFromAddress', label: 'GotLocationFromAddress', args: ['address', 'latitude', 'longitude'] }, { id: 'LocationChanged', label: 'LocationChanged', args: ['latitude', 'longitude', 'altitude', 'speed'] }, { id: 'StatusChanged', label: 'StatusChanged', args: ['provider', 'status'] }];
        if (type === 'MAGNETIC_FIELD_SENSOR') return [{ id: 'MagneticChanged', label: 'MagneticChanged', args: ['xStrength', 'yStrength', 'zStrength', 'absoluteStrength'] }];
        if (type === 'NEAR_FIELD') return [{ id: 'TagRead', label: 'TagRead', args: ['message'] }, { id: 'TagWritten', label: 'TagWritten' }];
        if (type === 'ORIENTATION_SENSOR') return [{ id: 'OrientationChanged', label: 'OrientationChanged', args: ['azimuth', 'pitch', 'roll'] }];
        if (type === 'PEDOMETER') return [{ id: 'SimpleStep', label: 'SimpleStep', args: ['simpleSteps', 'distance'] }, { id: 'WalkStep', label: 'WalkStep', args: ['walkSteps', 'distance'] }];
        if (type === 'PROXIMITY_SENSOR') return [{ id: 'ProximityChanged', label: 'ProximityChanged', args: ['distance'] }];
        if (type === 'THERMOMETER') return [{ id: 'TemperatureChanged', label: 'TemperatureChanged', args: ['temperature'] }];
        // --- End Sensor Events ---

        // --- Social Events ---
        if (['CONTACT_PICKER', 'PHONE_NUMBER_PICKER'].includes(type)) {
            return [
                { id: 'AfterPicking', label: 'AfterPicking', args: [] },
                { id: 'BeforePicking', label: 'BeforePicking', args: [] },
                { id: 'GotFocus', label: 'GotFocus', args: [] },
                { id: 'LostFocus', label: 'LostFocus', args: [] },
                { id: 'TouchDown', label: 'TouchDown', args: [] },
                { id: 'TouchUp', label: 'TouchUp', args: [] }
            ];
        }
        if (type === 'EMAIL_PICKER') {
            return [
                { id: 'GotFocus', label: 'GotFocus', args: [] },
                { id: 'LostFocus', label: 'LostFocus', args: [] },
                { id: 'TextChanged', label: 'TextChanged', args: [] }
            ];
        }
        if (type === 'PHONE_CALL') {
            return [
                { id: 'IncomingCallAnswered', label: 'IncomingCallAnswered', args: ['phoneNumber'] },
                { id: 'PhoneCallEnded', label: 'PhoneCallEnded', args: ['status', 'phoneNumber'] },
                { id: 'PhoneCallStarted', label: 'PhoneCallStarted', args: ['status', 'phoneNumber'] }
            ];
        }
        if (type === 'TEXTING') {
            return [
                { id: 'MessageReceived', label: 'MessageReceived', args: ['number', 'messageText'] }
            ];
        }
        // --- End Social Events ---

        // --- Drawing and Animation Events ---
        if (type === 'CANVAS') {
            return [
                { id: 'Dragged', label: 'Dragged', args: ['startX', 'startY', 'prevX', 'prevY', 'currentX', 'currentY', 'draggedAnySprite'] },
                { id: 'Flung', label: 'Flung', args: ['x', 'y', 'speed', 'heading', 'xvel', 'yvel', 'flungSprite'] },
                { id: 'TouchDown', label: 'TouchDown', args: ['x', 'y'] },
                { id: 'TouchUp', label: 'TouchUp', args: ['x', 'y'] },
                { id: 'Touched', label: 'Touched', args: ['x', 'y', 'touchedAnySprite'] }
            ];
        }
        if (type === 'BALL' || type === 'IMAGE_SPRITE') {
            return [
                { id: 'CollidedWith', label: 'CollidedWith', args: ['other'] },
                { id: 'Dragged', label: 'Dragged', args: ['startX', 'startY', 'prevX', 'prevY', 'currentX', 'currentY'] },
                { id: 'EdgeReached', label: 'EdgeReached', args: ['edge'] },
                { id: 'Flung', label: 'Flung', args: ['x', 'y', 'speed', 'heading', 'xvel', 'yvel'] },
                { id: 'NoLongerCollidingWith', label: 'NoLongerCollidingWith', args: ['other'] },
                { id: 'TouchDown', label: 'TouchDown', args: ['x', 'y'] },
                { id: 'TouchUp', label: 'TouchUp', args: ['x', 'y'] },
                { id: 'Touched', label: 'Touched', args: ['x', 'y'] }
            ];
        }
        // --- End Drawing and Animation Events ---

        // --- Connectivity Events ---
        if (type === 'ACTIVITY_STARTER') {
            return [
                { id: 'ActivityCanceled', label: 'ActivityCanceled', args: [] },
                { id: 'AfterActivity', label: 'AfterActivity', args: ['result'] }
            ];
        }
        if (type === 'BLUETOOTH_SERVER') return [{ id: 'ConnectionAccepted', label: 'ConnectionAccepted', args: [] }];
        if (type === 'WEB') {
            return [
                { id: 'GotFile', label: 'GotFile', args: ['url', 'responseCode', 'responseType', 'fileName'] },
                { id: 'GotText', label: 'GotText', args: ['url', 'responseCode', 'responseType', 'responseContent'] },
                { id: 'TimedOut', label: 'TimedOut', args: ['url'] }
            ];
        }
        // --- End Connectivity Events ---

        // --- Storage Events ---
        if (type === 'CLOUD_DB') return [{ id: 'CloudDBError', label: 'CloudDBError', args: ['message'] }, { id: 'DataChanged', label: 'DataChanged', args: ['tag', 'value'] }, { id: 'FirstRemoved', label: 'FirstRemoved', args: ['value'] }, { id: 'GotValue', label: 'GotValue', args: ['tag', 'value'] }, { id: 'TagList', label: 'TagList', args: ['value'] }, { id: 'UpdateDone', label: 'UpdateDone', args: ['tag', 'operation'] }];
        if (['FILE', 'FILE_STORAGE'].includes(type)) return [{ id: 'AfterFileSaved', label: 'AfterFileSaved', args: ['fileName'] }, { id: 'GotText', label: 'GotText', args: ['text'] }];
        if (type === 'SPREADSHEET') return [
            { id: 'ErrorOccurred', label: 'ErrorOccurred', args: ['errorMessage'] },
            { id: 'FinishedAddColumn', label: 'FinishedAddColumn', args: ['columnNumber'] },
            { id: 'FinishedAddRow', label: 'FinishedAddRow', args: ['rowNumber'] },
            { id: 'FinishedAddSheet', label: 'FinishedAddSheet', args: ['sheetName'] },
            { id: 'FinishedClearRange', label: 'FinishedClearRange' },
            { id: 'FinishedDeleteSheet', label: 'FinishedDeleteSheet', args: ['sheetName'] },
            { id: 'FinishedRemoveColumn', label: 'FinishedRemoveColumn' },
            { id: 'FinishedRemoveRow', label: 'FinishedRemoveRow' },
            { id: 'FinishedWriteCell', label: 'FinishedWriteCell' },
            { id: 'FinishedWriteColumn', label: 'FinishedWriteColumn' },
            { id: 'FinishedWriteRange', label: 'FinishedWriteRange' },
            { id: 'FinishedWriteRow', label: 'FinishedWriteRow' },
            { id: 'GotCellData', label: 'GotCellData', args: ['cellData'] },
            { id: 'GotColumnData', label: 'GotColumnData', args: ['columnData'] },
            { id: 'GotRangeData', label: 'GotRangeData', args: ['rangeData'] },
            { id: 'GotRowData', label: 'GotRowData', args: ['rowDataList'] },
            { id: 'GotSheetData', label: 'GotSheetData', args: ['sheetData'] },
            { id: 'GotSheetList', label: 'GotSheetList', args: ['sheetNames'] }
        ];
        if (type === 'TINY_WEB_DB') return [{ id: 'GotValue', label: 'GotValue', args: ['tagFromWebDB', 'valueFromWebDB'] }, { id: 'ValueStored', label: 'ValueStored' }, { id: 'WebServiceError', label: 'WebServiceError', args: ['message'] }];
        // --- End Storage Events ---

        // --- Map Events ---
        if (type === 'MAP') return [
            { id: 'BoundsChange', label: 'BoundsChange' },
            { id: 'DoubleTapAtPoint', label: 'DoubleTapAtPoint', args: ['latitude', 'longitude'] },
            { id: 'FeatureClick', label: 'FeatureClick', args: ['feature'] },
            { id: 'FeatureDrag', label: 'FeatureDrag', args: ['feature'] },
            { id: 'FeatureLongClick', label: 'FeatureLongClick', args: ['feature'] },
            { id: 'FeatureStartDrag', label: 'FeatureStartDrag', args: ['feature'] },
            { id: 'FeatureStopDrag', label: 'FeatureStopDrag', args: ['feature'] },
            { id: 'GotFeatures', label: 'GotFeatures', args: ['url', 'features'] },
            { id: 'InvalidPoint', label: 'InvalidPoint', args: ['message'] },
            { id: 'LoadError', label: 'LoadError', args: ['url', 'responseCode', 'errorMessage'] },
            { id: 'LongPressAtPoint', label: 'LongPressAtPoint', args: ['latitude', 'longitude'] },
            { id: 'Ready', label: 'Ready' },
            { id: 'TapAtPoint', label: 'TapAtPoint', args: ['latitude', 'longitude'] },
            { id: 'ZoomChange', label: 'ZoomChange' }
        ];
        if (['MARKER', 'CIRCLE', 'POLYGON', 'RECTANGLE', 'LINE_STRING'].includes(type)) return [
            { id: 'Click', label: 'Click' },
            { id: 'Drag', label: 'Drag' },
            { id: 'LongClick', label: 'LongClick' },
            { id: 'StartDrag', label: 'StartDrag' },
            { id: 'StopDrag', label: 'StopDrag' }
        ];
        if (type === 'FEATURE_COLLECTION') return [
            { id: 'FeatureClick', label: 'FeatureClick', args: ['feature'] },
            { id: 'FeatureDrag', label: 'FeatureDrag', args: ['feature'] },
            { id: 'FeatureLongClick', label: 'FeatureLongClick', args: ['feature'] },
            { id: 'FeatureStartDrag', label: 'FeatureStartDrag', args: ['feature'] },
            { id: 'FeatureStopDrag', label: 'FeatureStopDrag', args: ['feature'] },
            { id: 'GotFeatures', label: 'GotFeatures', args: ['url', 'features'] },
            { id: 'LoadError', label: 'LoadError', args: ['url', 'responseCode', 'errorMessage'] }
        ];
        if (type === 'NAVIGATION') return [{ id: 'GotDirections', label: 'GotDirections', args: ['directions', 'points', 'distance', 'duration'] }];
        // --- End Map Events ---

        // --- Chart Events ---
        if (type === 'CHART') return [{ id: 'EntryClick', label: 'EntryClick', args: ['series', 'x', 'y'] }];
        if (type === 'CHART_DATA_2D') return [{ id: 'EntryClick', label: 'EntryClick', args: ['x', 'y'] }];
        if (type === 'TRENDLINE') return [{ id: 'Updated', label: 'Updated', args: ['results'] }];
        // --- End Chart Events ---
        if (['TEXT_INPUT', 'TEXT_AREA'].includes(type)) {
            return [
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TextChanged', label: 'TextChanged' }
            ];
        }
        if (type === 'DATETIME_PICKER') {
            return [
                { id: 'AfterTimeSet', label: 'AfterTimeSet' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (type === 'BOOLEAN_TOGGLE') {
            return [
                { id: 'Changed', label: 'Changed' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' }
            ];
        }
        if (type === 'DROPDOWN') {
            return [
                { id: 'AfterSelecting', label: 'AfterSelecting' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (type === 'SLIDER') {
            return [
                { id: 'PositionChanged', label: 'PositionChanged' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (type === 'CHECKBOX') {
            return [
                { id: 'Changed', label: 'Changed' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' }
            ];
        }
        if (type === 'DATE_PICKER') {
            return [
                { id: 'AfterDateSet', label: 'AfterDateSet' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (type === 'IMAGE') {
            return [
                { id: 'Click', label: 'Click' }
            ];
        }
        if (type === 'LIST_PICKER') {
            return [
                { id: 'AfterPicking', label: 'AfterPicking' },
                { id: 'BeforePicking', label: 'BeforePicking' },
                { id: 'GotFocus', label: 'GotFocus' },
                { id: 'LostFocus', label: 'LostFocus' },
                { id: 'TouchDown', label: 'TouchDown' },
                { id: 'TouchUp', label: 'TouchUp' }
            ];
        }
        if (type === 'LIST_VIEW') {
            return [
                { id: 'AfterPicking', label: 'AfterPicking' }
            ];
        }
        if (type === 'NOTIFIER') {
            return [
                { id: 'AfterChoosing', label: 'AfterChoosing' },
                { id: 'AfterTextInput', label: 'AfterTextInput' },
                { id: 'ChoosingCanceled', label: 'ChoosingCanceled' },
                { id: 'TextInputCanceled', label: 'TextInputCanceled' }
            ];
        }
        if (type === 'MACHINE_STATUS') {
            return [{ id: 'StatusChanged', label: 'Status is Changed' }];
        }
        if (type === 'CAMERA_SCANNER') {
            return [
                { id: 'CodeScanned', label: 'detects a Code' },
                { id: 'VisionError', label: 'encounters a Vision Error' }
            ];
        }
        if (type === 'EMBED_WEB') {
            return [
                { id: 'BeforePageLoad', label: 'BeforePageLoad' },
                { id: 'ErrorOccurred', label: 'ErrorOccurred' },
                { id: 'PageLoaded', label: 'PageLoaded' },
                { id: 'WebViewStringChange', label: 'WebViewStringChange' }
            ];
        }
        if (type === 'SIGNATURE_PAD') {
            return [
                { id: 'SignatureCaptured', label: 'Captured' },
                { id: 'SignatureCleared', label: 'Cleared' }
            ];
        }
        if (type === 'MULTI_SELECT') {
            return [{ id: 'SelectionChanged', label: 'Selection Changed' }];
        }
        if (type === 'TABLE_AGGREGATION') {
            return [{ id: 'AggregationUpdated', label: 'Aggregation Updated' }];
        }
        if (type === 'RECORD_DISPLAY') {
            return [{ id: 'RecordLoaded', label: 'Record Loaded' }];
        }
        return [{ id: 'ON_INTERACT', label: 'is Interacted with' }];
    };
    const getComponentProperties = (type) => {
        const baseProps = [['Visible', 'visible'], ['BackgroundColor', 'backgroundColor'], ['Enabled', 'enabled'], ['Blink', 'isBlinking', 'BOOLEAN']];

        if (['HORIZONTAL_ARRANGEMENT', 'VERTICAL_ARRANGEMENT'].includes(type)) {
            return [
                ['Visible', 'visible'],
                ['AlignHorizontal', 'alignHorizontal'],
                ['AlignVertical', 'alignVertical'],
                ['BackgroundColor', 'backgroundColor'],
                ['Image', 'image'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent'],
                ['Spacing', 'spacing'],
                ['Padding', 'padding']
            ];
        }

        // --- Media Properties ---
        if (type === 'FILE_PICKER') {
            return [
                ...baseProps, ['Action', 'action'], ['FontBold', 'fontBold'], ['FontItalic', 'fontItalic'], ['FontSize', 'fontSize'], ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'], ['HeightPercent', 'heightPercent'], ['Image', 'image'], ['MimeType', 'mimeType'], ['Selection', 'selection'],
                ['Shape', 'shape'], ['ShowFeedback', 'showFeedback'], ['Text', 'text'], ['TextAlignment', 'textAlignment'], ['TextColor', 'textColor'],
                ['Width', 'width'], ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'IMAGE_PICKER') {
            return [
                ...baseProps, ['FontBold', 'fontBold'], ['FontItalic', 'fontItalic'], ['FontSize', 'fontSize'], ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'], ['HeightPercent', 'heightPercent'], ['Image', 'image'], ['Selection', 'selection'],
                ['Shape', 'shape'], ['ShowFeedback', 'showFeedback'], ['Text', 'text'], ['TextAlignment', 'textAlignment'], ['TextColor', 'textColor'],
                ['Width', 'width'], ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'PLAYER') return [['IsPlaying', 'isPlaying'], ['Loop', 'loop'], ['PlayOnlyInForeground', 'playOnlyInForeground'], ['Source', 'source'], ['Volume', 'volume']];
        if (type === 'SOUND') return [['MinimumInterval', 'minimumInterval'], ['Source', 'source']];
        if (type === 'SOUND_RECORDER') return [['SavedRecording', 'savedRecording']];
        if (type === 'SPEECH_RECOGNIZER') return [['Language', 'language'], ['Result', 'result'], ['UseLegacy', 'useLegacy']];
        if (type === 'TEXT_TO_SPEECH') return [['AvailableCountries', 'availableCountries'], ['AvailableLanguages', 'availableLanguages'], ['Country', 'country'], ['Language', 'language'], ['Pitch', 'pitch'], ['Result', 'result'], ['SpeechRate', 'speechRate']];
        if (type === 'VIDEO_PLAYER') return [['Visible', 'visible'], ['FullScreen', 'fullScreen'], ['Height', 'height'], ['HeightPercent', 'heightPercent'], ['Source', 'source'], ['Volume', 'volume'], ['Width', 'width'], ['WidthPercent', 'widthPercent']];
        // Note: CAMCORDER and CAMERA intentionally omitted as they have no properties per MIT AI2 spec.
        // --- End Media Properties ---

        // --- Sensor Properties ---
        if (type === 'ACCELEROMETER') return [['Available', 'available'], ['Enabled', 'enabled'], ['LegacyMode', 'legacyMode'], ['MinimumInterval', 'minimumInterval'], ['Sensitivity', 'sensitivity'], ['XAccel', 'xAccel'], ['YAccel', 'yAccel'], ['ZAccel', 'zAccel']];
        if (type === 'BARCODE_SCANNER') return [['Result', 'result'], ['UseExternalScanner', 'useExternalScanner']];
        if (type === 'BAROMETER') return [['AirPressure', 'airPressure'], ['Available', 'available'], ['Enabled', 'enabled'], ['RefreshTime', 'refreshTime']];
        if (type === 'CLOCK') return [['TimerAlwaysFires', 'timerAlwaysFires'], ['TimerEnabled', 'timerEnabled'], ['TimerInterval', 'timeInterval']];
        if (type === 'GYROSCOPE_SENSOR') return [['Available', 'available'], ['Enabled', 'enabled'], ['XAngularVelocity', 'xAngularVelocity'], ['YAngularVelocity', 'yAngularVelocity'], ['ZAngularVelocity', 'zAngularVelocity']];
        if (type === 'HYGROMETER') return [['Available', 'available'], ['Enabled', 'enabled'], ['Humidity', 'humidity'], ['RefreshTime', 'refreshTime']];
        if (type === 'LIGHT_SENSOR') return [['Available', 'available'], ['AverageLux', 'averageLux'], ['Enabled', 'enabled'], ['Lux', 'lux'], ['RefreshTime', 'refreshTime']];
        if (type === 'LOCATION_SENSOR') return [['Accuracy', 'accuracy'], ['Altitude', 'altitude'], ['AvailableProviders', 'availableProviders'], ['CurrentAddress', 'currentAddress'], ['DistanceInterval', 'distanceInterval'], ['Enabled', 'enabled'], ['HasAccuracy', 'hasAccuracy'], ['HasAltitude', 'hasAltitude'], ['HasLongitudeLatitude', 'hasLongitudeLatitude'], ['Latitude', 'latitude'], ['Longitude', 'longitude'], ['ProviderLocked', 'providerLocked'], ['ProviderName', 'providerName'], ['TimeInterval', 'timeInterval']];
        if (type === 'MAGNETIC_FIELD_SENSOR') return [['AbsoluteStrength', 'absoluteStrength'], ['Available', 'available'], ['Enabled', 'enabled'], ['MaximumRange', 'maximumRange'], ['XStrength', 'xStrength'], ['YStrength', 'yStrength'], ['ZStrength', 'zStrength']];
        if (type === 'NEAR_FIELD') return [['LastMessage', 'lastMessage'], ['ReadMode', 'readMode'], ['TextToWrite', 'textToWrite'], ['WriteType', 'writeType']];
        if (type === 'ORIENTATION_SENSOR') return [['Angle', 'angle'], ['Available', 'available'], ['Azimuth', 'azimuth'], ['Enabled', 'enabled'], ['Magnitude', 'magnitude'], ['Pitch', 'pitch'], ['Roll', 'roll']];
        if (type === 'PEDOMETER') return [['Distance', 'distance'], ['ElapsedTime', 'elapsedTime'], ['SimpleSteps', 'simpleSteps'], ['StopDetectionTimeout', 'stopDetectionTimeout'], ['StrideLength', 'strideLength'], ['WalkSteps', 'walkSteps']];
        if (type === 'PROXIMITY_SENSOR') return [['Available', 'available'], ['Distance', 'distance'], ['Enabled', 'enabled'], ['KeepRunningWhenOnPause', 'keepRunningWhenOnPause'], ['MaximumRange', 'maximumRange']];
        if (type === 'THERMOMETER') return [['Available', 'available'], ['Enabled', 'enabled'], ['RefreshTime', 'refreshTime'], ['Temperature', 'temperature']];
        // --- End Sensor Properties ---

        // --- Storage Properties ---
        if (type === 'CLOUD_DB') return [['ProjectID', 'projectID'], ['RedisPort', 'redisPort'], ['RedisServer', 'redisServer'], ['Token', 'token'], ['UseSSL', 'useSSL']];
        if (type === 'DATA_FILE') return [['ColumnNames', 'columnNames'], ['Columns', 'columns'], ['DefaultScope', 'defaultScope'], ['Rows', 'rows'], ['SourceFile', 'sourceFile']];
        if (['FILE', 'FILE_STORAGE'].includes(type)) return [['DefaultScope', 'defaultScope'], ['ReadPermission', 'readPermission'], ['Scope', 'scope'], ['WritePermission', 'writePermission']];
        if (type === 'SPREADSHEET') return [['ApplicationName', 'applicationName'], ['CredentialsJson', 'credentialsJson'], ['SpreadsheetID', 'spreadsheetID']];
        if (type === 'TINY_DB') return [['Namespace', 'namespace']];
        if (type === 'TINY_WEB_DB') return [['ServiceURL', 'serviceURL']];
        // --- End Storage Properties ---

        // --- Map Properties ---
        if (type === 'MAP') return [['BoundingBox', 'boundingBox'], ['CenterFromString', 'center'], ['CustomUrl', 'customUrl'], ['EnablePan', 'enablePan'], ['EnableRotation', 'enableRotation'], ['EnableZoom', 'enableZoom'], ['Features', 'features'], ['Height', 'height'], ['Latitude', 'latitude'], ['LocationSensor', 'locationSensor'], ['Longitude', 'longitude'], ['MapType', 'mapType'], ['Rotation', 'rotation'], ['ScaleUnits', 'scaleUnits'], ['ShowCompass', 'showCompass'], ['ShowScale', 'showScale'], ['ShowUser', 'showUser'], ['ShowZoom', 'showZoom'], ['UserLatitude', 'userLatitude'], ['UserLongitude', 'userLongitude'], ['ZoomLevel', 'zoomLevel']];
        if (type === 'MARKER') return [['AnchorHorizontal', 'anchorHorizontal'], ['AnchorVertical', 'anchorVertical'], ['Description', 'description'], ['Draggable', 'draggable'], ['EnableInfobox', 'enableInfobox'], ['FillColor', 'fillColor'], ['FillOpacity', 'fillOpacity'], ['Height', 'height'], ['ImageAsset', 'imageAsset'], ['Latitude', 'latitude'], ['Longitude', 'longitude'], ['StrokeColor', 'strokeColor'], ['StrokeOpacity', 'strokeOpacity'], ['StrokeWidth', 'strokeWidth'], ['Title', 'title'], ['Visible', 'visible'], ['Width', 'width']];
        if (type === 'CIRCLE') return [['Description', 'description'], ['Draggable', 'draggable'], ['EnableInfobox', 'enableInfobox'], ['FillColor', 'fillColor'], ['FillOpacity', 'fillOpacity'], ['Latitude', 'latitude'], ['Longitude', 'longitude'], ['Radius', 'radius'], ['StrokeColor', 'strokeColor'], ['StrokeOpacity', 'strokeOpacity'], ['StrokeWidth', 'strokeWidth'], ['Title', 'title'], ['Visible', 'visible']];
        if (type === 'POLYGON') return [['Description', 'description'], ['Draggable', 'draggable'], ['EnableInfobox', 'enableInfobox'], ['FillColor', 'fillColor'], ['FillOpacity', 'fillOpacity'], ['HolePoints', 'holePoints'], ['HolePointsFromString', 'holePointsFromString'], ['Points', 'points'], ['PointsFromString', 'pointsFromString'], ['StrokeColor', 'strokeColor'], ['StrokeOpacity', 'strokeOpacity'], ['StrokeWidth', 'strokeWidth'], ['Title', 'title'], ['Visible', 'visible']];
        if (type === 'RECTANGLE') return [['Description', 'description'], ['Draggable', 'draggable'], ['EastLongitude', 'eastLongitude'], ['EnableInfobox', 'enableInfobox'], ['FillColor', 'fillColor'], ['FillOpacity', 'fillOpacity'], ['NorthLatitude', 'northLatitude'], ['SouthLatitude', 'southLatitude'], ['StrokeColor', 'strokeColor'], ['StrokeOpacity', 'strokeOpacity'], ['StrokeWidth', 'strokeWidth'], ['Title', 'title'], ['Visible', 'visible'], ['WestLongitude', 'westLongitude']];
        if (type === 'LINE_STRING') return [['Description', 'description'], ['Draggable', 'draggable'], ['EnableInfobox', 'enableInfobox'], ['Points', 'points'], ['PointsFromString', 'pointsFromString'], ['StrokeColor', 'strokeColor'], ['StrokeOpacity', 'strokeOpacity'], ['StrokeWidth', 'strokeWidth'], ['Title', 'title'], ['Visible', 'visible']];
        if (type === 'FEATURE_COLLECTION') return [['Features', 'features'], ['FeaturesFromGeoJSON', 'featuresFromGeoJSON'], ['Height', 'height'], ['Source', 'source'], ['Visible', 'visible'], ['Width', 'width']];
        if (type === 'NAVIGATION') return [['ApiKey', 'apiKey'], ['EndLatitude', 'endLatitude'], ['EndLocation', 'endLocation'], ['EndLongitude', 'endLongitude'], ['Language', 'language'], ['ResponseContent', 'responseContent'], ['StartLatitude', 'startLatitude'], ['StartLocation', 'startLocation'], ['StartLongitude', 'startLongitude'], ['TransportationMethod', 'transportationMethod']];
        // --- End Map Properties ---

        // --- Chart Properties ---
        if (type === 'CHART') return [['AxesTextColor', 'axesTextColor'], ['BackgroundColor', 'backgroundColor'], ['Description', 'description'], ['GridEnabled', 'gridEnabled'], ['Height', 'height'], ['Labels', 'labels'], ['LabelsFromString', 'labelsFromString'], ['LegendEnabled', 'legendEnabled'], ['PieRadius', 'pieRadius'], ['Type', 'type'], ['ValueFormat', 'valueFormat'], ['Visible', 'visible'], ['Width', 'width'], ['XFromZero', 'xFromZero'], ['YFromZero', 'yFromZero']];
        if (type === 'CHART_DATA_2D') return [['Color', 'color'], ['Colors', 'colors'], ['DataFileXColumn', 'dataFileXColumn'], ['DataFileYColumn', 'dataFileYColumn'], ['DataLabelColor', 'dataLabelColor'], ['DataSourceKey', 'dataSourceKey'], ['ElementsFromPairs', 'elementsFromPairs'], ['Label', 'label'], ['LineType', 'lineType'], ['PointShape', 'pointShape'], ['Source', 'source'], ['SpreadsheetUseHeaders', 'spreadsheetUseHeaders'], ['SpreadsheetXColumn', 'spreadsheetXColumn'], ['SpreadsheetYColumn', 'spreadsheetYColumn'], ['WebXColumn', 'webXColumn'], ['WebYColumn', 'webYColumn']];
        if (type === 'TRENDLINE') return [['ChartData', 'chartData'], ['Color', 'color'], ['CorrelationCoefficient', 'correlationCoefficient'], ['ExponentialBase', 'exponentialBase'], ['ExponentialCoefficient', 'exponentialCoefficient'], ['Extend', 'extend'], ['LinearCoefficient', 'linearCoefficient'], ['LogarithmCoefficient', 'logarithmCoefficient'], ['LogarithmConstant', 'logarithmConstant'], ['Model', 'model'], ['Predictions', 'predictions'], ['QuadraticCoefficient', 'quadraticCoefficient'], ['RSquared', 'rSquared'], ['Results', 'results'], ['StrokeStyle', 'strokeStyle'], ['StrokeWidth', 'strokeWidth'], ['Visible', 'visible'], ['XIntercepts', 'xIntercepts'], ['YIntercept', 'yIntercept']];
        // --- End Chart Properties ---

        // --- Social Properties ---
        if (type === 'CONTACT_PICKER' || type === 'PHONE_NUMBER_PICKER') {
            return [
                ['BackgroundColor', 'backgroundColor'], ['ContactName', 'contactName'], ['ContactUri', 'contactUri'],
                ['EmailAddress', 'emailAddress'], ['EmailAddressList', 'emailAddressList'], ['Enabled', 'enabled'],
                ['FontBold', 'fontBold'], ['FontItalic', 'fontItalic'], ['FontSize', 'fontSize'], ['Height', 'height'],
                ['Image', 'image'], ['PhoneNumber', 'phoneNumber'], ['PhoneNumberList', 'phoneNumberList'],
                ['Picture', 'picture'], ['Shape', 'shape'], ['ShowFeedback', 'showFeedback'], ['Text', 'text'],
                ['TextColor', 'textColor'], ['Visible', 'visible'], ['Width', 'width']
            ];
        }
        if (type === 'EMAIL_PICKER') {
            return [
                ['BackgroundColor', 'backgroundColor'], ['Enabled', 'enabled'], ['FontSize', 'fontSize'],
                ['Height', 'height'], ['Hint', 'hint'], ['HintColor', 'hintColor'], ['Text', 'text'],
                ['TextColor', 'textColor'], ['Visible', 'visible'], ['Width', 'width']
            ];
        }
        if (type === 'PHONE_CALL') return [['PhoneNumber', 'phoneNumber']];
        if (type === 'TEXTING') {
            return [
                ...baseProps,
                ['GoogleVoiceEnabled', 'googleVoiceEnabled'], ['Message', 'message'],
                ['PhoneNumber', 'phoneNumber'], ['ReceivingEnabled', 'receivingEnabled']
            ];
        }
        // --- End Social Properties ---

        // --- Drawing and Animation Properties ---
        if (type === 'CANVAS') {
            return [
                ['BackgroundColor', 'backgroundColor'], ['BackgroundImage', 'backgroundImage'],
                ['FontSize', 'fontSize'], ['Height', 'height'], ['LineWidth', 'lineWidth'],
                ['PaintColor', 'paintColor'], ['TapThreshold', 'tapThreshold'],
                ['TextAlignment', 'textAlignment'], ['Visible', 'visible'], ['Width', 'width']
            ];
        }
        if (type === 'BALL') {
            return [
                ['Enabled', 'enabled'], ['Heading', 'heading'], ['Interval', 'interval'],
                ['OriginAtCenter', 'originAtCenter'], ['PaintColor', 'paintColor'],
                ['Radius', 'radius'], ['Speed', 'speed'], ['Visible', 'visible'],
                ['X', 'x'], ['Y', 'y'], ['Z', 'z']
            ];
        }
        if (type === 'IMAGE_SPRITE') {
            return [
                ['Enabled', 'enabled'], ['Heading', 'heading'], ['Height', 'height'],
                ['Interval', 'interval'], ['Picture', 'picture'], ['Rotates', 'rotates'],
                ['Speed', 'speed'], ['Visible', 'visible'], ['Width', 'width'],
                ['X', 'x'], ['Y', 'y'], ['Z', 'z']
            ];
        }
        // --- End Drawing and Animation Properties ---

        // --- Connectivity Properties ---
        if (type === 'ACTIVITY_STARTER') {
            return [
                ['Action', 'action'], ['ActivityClass', 'activityClass'], ['ActivityPackage', 'activityPackage'],
                ['DataType', 'dataType'], ['DataUri', 'dataUri'], ['ExtraKey', 'extraKey'], ['ExtraValue', 'extraValue'],
                ['Extras', 'extras'], ['Result', 'result'], ['ResultName', 'resultName'], ['ResultType', 'resultType'],
                ['ResultUri', 'resultUri']
            ];
        }
        if (type === 'BLUETOOTH_CLIENT') {
            return [
                ['AddressesAndNames', 'addressesAndNames'], ['Available', 'available'], ['CharacterEncoding', 'characterEncoding'],
                ['DelimiterByte', 'delimiterByte'], ['DisconnectOnError', 'disconnectOnError'], ['Enabled', 'enabled'],
                ['HighByteFirst', 'highByteFirst'], ['IsConnected', 'isConnected'], ['PollingRate', 'pollingRate'], ['Secure', 'secure']
            ];
        }
        if (type === 'BLUETOOTH_SERVER') {
            return [
                ['Available', 'available'], ['CharacterEncoding', 'characterEncoding'], ['DelimiterByte', 'delimiterByte'],
                ['Enabled', 'enabled'], ['HighByteFirst', 'highByteFirst'], ['IsAccepting', 'isAccepting'],
                ['IsConnected', 'isConnected'], ['Secure', 'secure']
            ];
        }
        if (type === 'SERIAL') {
            return [['BaudRate', 'baudRate'], ['BufferSize', 'bufferSize'], ['IsInitialized', 'isInitialized'], ['IsOpen', 'isOpen']];
        }
        if (type === 'WEB') {
            return [
                ['AllowCookies', 'allowCookies'], ['ResponseFileName', 'responseFileName'], ['ResponseTextEncoding', 'responseTextEncoding'],
                ['SaveResponse', 'saveResponse'], ['Timeout', 'timeout'], ['Url', 'url']
            ];
        }
        // --- End Connectivity Properties ---

        if (type === 'BUTTON') {
            return [
                ...baseProps,
                ['Text', 'text'],
                ['TextColor', 'textColor'],
                ['FontSize', 'fontSize'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent'],
                ['Image', 'image'],
                ['Shape', 'shape'],
                ['ShowFeedback', 'showFeedback'],
                ['TextAlignment', 'textAlignment']
            ];
        }

        if (type === 'CHECKBOX') {
            return [
                ...baseProps,
                ['Text', 'text'],
                ['TextColor', 'textColor'],
                ['FontSize', 'fontSize'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent'],
                ['Checked', 'checked']
            ];
        }

        if (type === 'DATE_PICKER') {
            return [
                ...baseProps,
                ['Text', 'text'],
                ['TextColor', 'textColor'],
                ['FontSize', 'fontSize'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent'],
                ['Image', 'image'],
                ['Shape', 'shape'],
                ['ShowFeedback', 'showFeedback'],
                ['TextAlignment', 'textAlignment'],
                ['Year', 'year'],
                ['Month', 'month'],
                ['MonthInText', 'monthInText'],
                ['Day', 'day'],
                ['Instant', 'instant']
            ];
        }

        if (type === 'IMAGE') {
            return [
                ...baseProps,
                ['Picture', 'picture'],
                ['AlternateText', 'alternateText'],
                ['Animation', 'animation'],
                ['Clickable', 'clickable'],
                ['RotationAngle', 'rotationAngle'],
                ['ScalePictureToFit', 'scalePictureToFit'],
                ['Scaling', 'scaling'],
                ['Visible', 'visible'],
                ['Height', 'height'],
                ['Width', 'width']
            ];
        }

        if (['BARCODE', 'NUMBER_INPUT'].includes(type)) {
            return [...baseProps, ['Value', 'value'], ['Placeholder', 'placeholder'], ['Label', 'label']];
        }
        if (['TEXT_INPUT', 'TEXT_AREA'].includes(type)) {
            return [
                ...baseProps,
                ['BackgroundColor', 'backgroundColor'],
                ['Enabled', 'enabled', 'BOOLEAN'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontSize', 'fontSize'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Hint', 'hint'],
                ['HintColor', 'hintColor'],
                ['MultiLine', 'multiLine', 'BOOLEAN'],
                ['NumbersOnly', 'numbersOnly', 'BOOLEAN'],
                ['ReadOnly', 'readOnly', 'BOOLEAN'],
                ['Text', 'text'],
                ['TextAlignment', 'textAlignment', 'NUMBER'],
                ['TextColor', 'textColor'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'DATETIME_PICKER') {
            return [
                ...baseProps,
                ['BackgroundColor', 'backgroundColor'],
                ['Enabled', 'enabled', 'BOOLEAN'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontSize', 'fontSize'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Hour', 'hour', 'NUMBER'],
                ['Image', 'image'],
                ['Instant', 'instant'],
                ['Minute', 'minute', 'NUMBER'],
                ['Shape', 'shape', 'NUMBER'],
                ['ShowFeedback', 'showFeedback', 'BOOLEAN'],
                ['Text', 'text'],
                ['TextAlignment', 'textAlignment', 'NUMBER'],
                ['TextColor', 'textColor'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'BOOLEAN_TOGGLE') {
            return [
                ...baseProps,
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontSize', 'fontSize'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['On', 'on', 'BOOLEAN'],
                ['Text', 'text'],
                ['TextColor', 'textColor'],
                ['ThumbColorActive', 'thumbColorActive'],
                ['ThumbColorInactive', 'thumbColorInactive'],
                ['TrackColorActive', 'trackColorActive'],
                ['TrackColorInactive', 'trackColorInactive'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'DROPDOWN') {
            return [
                ...baseProps,
                ['BackgroundColor', 'backgroundColor'],
                ['Elements', 'elements'],
                ['ElementsFromString', 'elementsFromString'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontSize', 'fontSize'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Image', 'image'],
                ['Prompt', 'prompt'],
                ['Selection', 'selection'],
                ['SelectionIndex', 'selectionIndex', 'NUMBER'],
                ['ShowFeedback', 'showFeedback', 'BOOLEAN'],
                ['TextAlignment', 'textAlignment', 'NUMBER'],
                ['TextColor', 'textColor'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (['TEXT', 'VARIABLE_TEXT'].includes(type)) {
            return [
                ...baseProps,
                ['BackgroundColor', 'backgroundColor'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontSize', 'fontSize'],
                ['FontTypeface', 'fontTypeface'],
                ['HTMLContent', 'text'],
                ['HTMLFormat', 'htmlFormat'],
                ['HasMargins', 'hasMargins'],
                ['Text', 'text'],
                ['TextAlignment', 'textAlignment'],
                ['TextColor', 'textColor'],
                ['Visible', 'visible'],
                ['Height', 'height'],
                ['Width', 'width']
            ];
        }
        if (type === 'LIST_PICKER') {
            return [
                ...baseProps,
                ['Text', 'text'],
                ['TextColor', 'textColor'],
                ['FontSize', 'fontSize'],
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent'],
                ['Image', 'image'],
                ['Shape', 'shape'],
                ['TextAlignment', 'textAlignment'],
                ['Elements', 'elements'],
                ['ElementsFromString', 'elementsFromString'],
                ['ItemBackgroundColor', 'itemBackgroundColor'],
                ['ItemTextColor', 'itemTextColor'],
                ['Selection', 'selection'],
                ['SelectionIndex', 'selectionIndex'],
                ['ShowFilterBar', 'showFilterBar'],
                ['ShowFeedback', 'showFeedback'],
                ['Title', 'title']
            ];
        }
        if (type === 'LIST_VIEW') {
            return [
                ...baseProps,
                ['BackgroundColor', 'backgroundColor'],
                ['BounceEdgeEffect', 'bounceEdgeEffect'],
                ['DividerColor', 'dividerColor'],
                ['DividerThickness', 'dividerThickness'],
                ['ElementColor', 'elementColor'],
                ['ElementCornerRadius', 'elementCornerRadius'],
                ['ElementMarginsWidth', 'elementMarginsWidth'],
                ['Elements', 'elements'],
                ['ElementsFromString', 'elementsFromString'],
                ['FontSize', 'fontSize'],
                ['FontSizeDetail', 'fontSizeDetail'],
                ['FontTypeface', 'fontTypeface'],
                ['FontTypefaceDetail', 'fontTypefaceDetail'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['HintText', 'hintText'],
                ['ImageHeight', 'imageHeight'],
                ['ImageWidth', 'imageWidth'],
                ['ListData', 'listData'],
                ['ListViewLayout', 'listViewLayout'],
                ['Orientation', 'orientation'],
                ['Selection', 'selection'],
                ['SelectionColor', 'selectionColor'],
                ['SelectionDetailText', 'selectionDetailText'],
                ['SelectionIndex', 'selectionIndex'],
                ['ShowFilterBar', 'showFilterBar'],
                ['TextColor', 'textColor'],
                ['TextColorDetail', 'textColorDetail'],
                ['Visible', 'visible'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'PASSWORD_TEXT') {
            return [
                ...baseProps,
                ['FontBold', 'fontBold'],
                ['FontItalic', 'fontItalic'],
                ['FontSize', 'fontSize'],
                ['FontTypeface', 'fontTypeface'],
                ['Height', 'height'],
                ['HeightPercent', 'heightPercent'],
                ['Hint', 'hint'],
                ['HintColor', 'hintColor'],
                ['NumbersOnly', 'numbersOnly', 'BOOLEAN'],
                ['PasswordVisible', 'passwordVisible', 'BOOLEAN'],
                ['Text', 'text'],
                ['TextAlignment', 'textAlignment'],
                ['TextColor', 'textColor'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'NOTIFIER') {
            return [
                ['BackgroundColor', 'backgroundColor'],
                ['NotifierLength', 'notifierLength', 'NUMBER'],
                ['TextColor', 'textColor']
            ];
        }
        if (type === 'MACHINE_STATUS') {
            return [
                ...baseProps,
                ['Status', 'status'],
                ['Label', 'label'],
                ['Running Color', 'runningColor'],
                ['Stopped Color', 'stoppedColor'],
                ['Fault Color', 'faultColor']
            ];
        }
        if (type === 'PDF_VIEWER') {
            return [
                ...baseProps,
                ['PDF URL', 'url'],
                ['Title', 'title'],
                ['Page Number', 'page']
            ];
        }
        if (type === 'CAMERA_SCANNER') {
            return [
                ...baseProps,
                ['Active', 'active'],
                ['Last Result', 'lastResult'],
                ['Scan Type', 'scanType']
            ];
        }
        if (type === 'EMBED_WEB') {
            return [
                ['Visible', 'visible'],
                ['HomeUrl', 'homeUrl'],
                ['CurrentUrl', 'currentUrl'],
                ['CurrentPageTitle', 'currentPageTitle'],
                ['WebViewString', 'webViewString'],
                ['FollowLinks', 'followLinks'],
                ['IgnoreSslErrors', 'ignoreSslErrors'],
                ['PromptForPermission', 'promptForPermission'],
                ['UsesCamera', 'usesCamera'],
                ['UsesLocation', 'usesLocation'],
                ['UsesMicrophone', 'usesMicrophone'],
                ['Height', 'height'],
                ['Width', 'width'],
                ['HeightPercent', 'heightPercent'],
                ['WidthPercent', 'widthPercent']
            ];
        }
        if (type === 'SIGNATURE_PAD') {
            return [
                ...baseProps,
                ['Signature', 'signature'],
                ['PenColor', 'penColor'],
                ['PenWidth', 'penWidth', 'NUMBER']
            ];
        }
        if (type === 'MULTI_SELECT') {
            return [
                ...baseProps,
                ['Options', 'options'],
                ['Selection', 'selection'],
                ['Hint', 'hint']
            ];
        }
        if (type === 'TABLE_AGGREGATION') {
            return [
                ...baseProps,
                ['Value', 'value'],
                ['Label', 'label'],
                ['AggregationType', 'aggregationType']
            ];
        }
        if (type === 'RECORD_DISPLAY') {
            return [
                ...baseProps,
                ['Title', 'title'],
                ['RecordId', 'recordId'],
                ['DataSource', 'dataSource']
            ];
        }
        if (type === 'GAUGE_CIRCULAR') {
            return [
                ...baseProps,
                ['Value', 'value'],
                ['Min', 'min'],
                ['Max', 'max'],
                ['Unit', 'unit'],
                ['Title', 'title'],
                ['Color', 'color']
            ];
        }
        if (type === 'SLIDER') {
            return [
                ...baseProps,
                ['ColorLeft', 'colorLeft'],
                ['ColorRight', 'colorRight'],
                ['MaxValue', 'maxValue', 'NUMBER'],
                ['MinValue', 'minValue', 'NUMBER'],
                ['NumberOfSteps', 'numberOfSteps', 'NUMBER'],
                ['ThumbColor', 'thumbColor'],
                ['ThumbEnabled', 'thumbEnabled', 'BOOLEAN'],
                ['ThumbPosition', 'thumbPosition', 'NUMBER'],
                ['Width', 'width'],
                ['WidthPercent', 'widthPercent'],
                ['HeightPercent', 'heightPercent']
            ];
        }
        return baseProps;
    };

    const getMethodsForComponent = (type) => {
        // --- Media Methods ---
        if (type === 'CAMCORDER') return [{ id: 'RecordVideo', label: 'RecordVideo', args: [] }];
        if (['CAMERA', 'CAMERA_CAPTURE'].includes(type)) return [{ id: 'TakePicture', label: 'TakePicture', args: [] }];
        if (['FILE_PICKER', 'IMAGE_PICKER'].includes(type)) return [{ id: 'Open', label: 'Open', args: [] }];
        if (type === 'PLAYER') {
            return [{ id: 'Pause', label: 'Pause', args: [] }, { id: 'Start', label: 'Start', args: [] }, { id: 'Stop', label: 'Stop', args: [] }, { id: 'Vibrate', label: 'Vibrate', args: ['milliseconds'] }];
        }
        if (type === 'SOUND') {
            return [{ id: 'Pause', label: 'Pause', args: [] }, { id: 'Play', label: 'Play', args: [] }, { id: 'Resume', label: 'Resume', args: [] }, { id: 'Stop', label: 'Stop', args: [] }, { id: 'Vibrate', label: 'Vibrate', args: ['millisecs'] }];
        }
        if (type === 'SOUND_RECORDER') return [{ id: 'Start', label: 'Start', args: [] }, { id: 'Stop', label: 'Stop', args: [] }];
        if (type === 'SPEECH_RECOGNIZER') return [{ id: 'GetText', label: 'GetText', args: [] }, { id: 'Stop', label: 'Stop', args: [] }];
        if (type === 'TEXT_TO_SPEECH') return [{ id: 'Speak', label: 'Speak', args: ['message'] }, { id: 'Stop', label: 'Stop', args: [] }];
        if (type === 'VIDEO_PLAYER') {
            return [{ id: 'GetDuration', label: 'GetDuration', args: [] }, { id: 'Pause', label: 'Pause', args: [] }, { id: 'SeekTo', label: 'SeekTo', args: ['ms'] }, { id: 'Start', label: 'Start', args: [] }, { id: 'Stop', label: 'Stop', args: [] }];
        }
        // --- End Media Methods ---

        // --- Sensor Methods ---
        if (type === 'BARCODE_SCANNER') return [{ id: 'DoScan', label: 'DoScan', args: [] }];
        if (type === 'CLOCK') {
            return [
                { id: 'AddDays', label: 'AddDays', args: ['instant', 'quantity'] },
                { id: 'AddDuration', label: 'AddDuration', args: ['instant', 'quantity'] },
                { id: 'AddHours', label: 'AddHours', args: ['instant', 'quantity'] },
                { id: 'AddMinutes', label: 'AddMinutes', args: ['instant', 'quantity'] },
                { id: 'AddMonths', label: 'AddMonths', args: ['instant', 'quantity'] },
                { id: 'AddSeconds', label: 'AddSeconds', args: ['instant', 'quantity'] },
                { id: 'AddWeeks', label: 'AddWeeks', args: ['instant', 'quantity'] },
                { id: 'AddYears', label: 'AddYears', args: ['instant', 'quantity'] },
                { id: 'DayOfMonth', label: 'DayOfMonth', args: ['instant'] },
                { id: 'Duration', label: 'Duration', args: ['start', 'end'] },
                { id: 'DurationToDays', label: 'DurationToDays', args: ['duration'] },
                { id: 'DurationToHours', label: 'DurationToHours', args: ['duration'] },
                { id: 'DurationToMinutes', label: 'DurationToMinutes', args: ['duration'] },
                { id: 'DurationToSeconds', label: 'DurationToSeconds', args: ['duration'] },
                { id: 'DurationToWeeks', label: 'DurationToWeeks', args: ['duration'] },
                { id: 'FormatDate', label: 'FormatDate', args: ['instant', 'pattern'] },
                { id: 'FormatDateTime', label: 'FormatDateTime', args: ['instant', 'pattern'] },
                { id: 'FormatTime', label: 'FormatTime', args: ['instant'] },
                { id: 'GetMillis', label: 'GetMillis', args: ['instant'] },
                { id: 'Hour', label: 'Hour', args: ['instant'] },
                { id: 'MakeDate', label: 'MakeDate', args: ['year', 'month', 'day'] },
                { id: 'MakeInstant', label: 'MakeInstant', args: ['from'] },
                { id: 'MakeInstantFromMillis', label: 'MakeInstantFromMillis', args: ['millis'] },
                { id: 'MakeInstantFromParts', label: 'MakeInstantFromParts', args: ['year', 'month', 'day', 'hour', 'minute', 'second'] },
                { id: 'MakeTime', label: 'MakeTime', args: ['hour', 'minute', 'second'] },
                { id: 'Minute', label: 'Minute', args: ['instant'] },
                { id: 'Month', label: 'Month', args: ['instant'] },
                { id: 'MonthName', label: 'MonthName', args: ['instant'] },
                { id: 'Now', label: 'Now', args: [] },
                { id: 'Second', label: 'Second', args: ['instant'] },
                { id: 'SystemTime', label: 'SystemTime', args: [] },
                { id: 'Weekday', label: 'Weekday', args: ['instant'] },
                { id: 'WeekdayName', label: 'WeekdayName', args: ['instant'] },
                { id: 'Year', label: 'Year', args: ['instant'] }
            ];
        }
        if (type === 'LOCATION_SENSOR') {
            return [
                { id: 'Geocode', label: 'Geocode', args: ['address'] },
                { id: 'LatitudeFromAddress', label: 'LatitudeFromAddress', args: ['locationName'] },
                { id: 'LongitudeFromAddress', label: 'LongitudeFromAddress', args: ['locationName'] },
                { id: 'ReverseGeocode', label: 'ReverseGeocode', args: ['latitude', 'longitude'] }
            ];
        }
        if (type === 'PEDOMETER') return [{ id: 'Reset', label: 'Reset', args: [] }, { id: 'Save', label: 'Save', args: [] }, { id: 'Start', label: 'Start', args: [] }, { id: 'Stop', label: 'Stop', args: [] }];
        // Note: ACCELEROMETER, BAROMETER, GYROSCOPE, HYGROMETER, LIGHT_SENSOR, MAGNETIC_FIELD_SENSOR, NEAR_FIELD, ORIENTATION_SENSOR, PROXIMITY_SENSOR, THERMOMETER have no methods.
        // --- End Sensor Methods ---

        // --- Storage Methods ---
        if (type === 'CLOUD_DB') {
            return [
                { id: 'AppendValueToList', label: 'AppendValueToList', args: ['tag', 'itemToAdd'] },
                { id: 'ClearTag', label: 'ClearTag', args: ['tag'] },
                { id: 'CloudConnected', label: 'CloudConnected', args: [] },
                { id: 'GetTagList', label: 'GetTagList', args: [] },
                { id: 'GetValue', label: 'GetValue', args: ['tag', 'valueIfTagNotThere'] },
                { id: 'RemoveFirstFromList', label: 'RemoveFirstFromList', args: ['tag'] },
                { id: 'StoreValue', label: 'StoreValue', args: ['tag', 'valueToStore'] }
            ];
        }
        if (type === 'DATA_FILE') return [{ id: 'ReadFile', label: 'ReadFile', args: ['fileName'] }];
        if (['FILE', 'FILE_STORAGE'].includes(type)) {
            return [
                { id: 'AppendToFile', label: 'AppendToFile', args: ['text', 'fileName'] },
                { id: 'CopyFile', label: 'CopyFile', args: ['fromScope', 'fromFileName', 'toScope', 'toFileName'] },
                { id: 'Delete', label: 'Delete', args: ['fileName'] },
                { id: 'Exists', label: 'Exists', args: ['scope', 'path'] },
                { id: 'IsDirectory', label: 'IsDirectory', args: ['scope', 'path'] },
                { id: 'ListDirectory', label: 'ListDirectory', args: ['scope', 'directoryName'] },
                { id: 'MakeDirectory', label: 'MakeDirectory', args: ['scope', 'directoryName'] },
                { id: 'MakeFullPath', label: 'MakeFullPath', args: ['scope', 'path'] },
                { id: 'MoveFile', label: 'MoveFile', args: ['fromScope', 'fromFileName', 'toScope', 'toFileName'] },
                { id: 'ReadFrom', label: 'ReadFrom', args: ['fileName'] },
                { id: 'RemoveDirectory', label: 'RemoveDirectory', args: ['scope', 'directoryName', 'recursive'] },
                { id: 'SaveFile', label: 'SaveFile', args: ['text', 'fileName'] }
            ];
        }
        if (type === 'SPREADSHEET') {
            return [
                { id: 'AddColumn', label: 'AddColumn', args: ['sheetName', 'data'] },
                { id: 'AddRow', label: 'AddRow', args: ['sheetName', 'data'] },
                { id: 'AddSheet', label: 'AddSheet', args: ['sheetName'] },
                { id: 'ClearRange', label: 'ClearRange', args: ['sheetName', 'rangeReference'] },
                { id: 'DeleteSheet', label: 'DeleteSheet', args: ['sheetName'] },
                { id: 'GetCellReference', label: 'GetCellReference', args: ['row', 'column'] },
                { id: 'GetRangeReference', label: 'GetRangeReference', args: ['row1', 'column1', 'row2', 'column2'] },
                { id: 'ListSheets', label: 'ListSheets', args: [] },
                { id: 'ReadCell', label: 'ReadCell', args: ['sheetName', 'cellReference'] },
                { id: 'ReadColumn', label: 'ReadColumn', args: ['sheetName', 'column'] },
                { id: 'ReadRange', label: 'ReadRange', args: ['sheetName', 'rangeReference'] },
                { id: 'ReadRow', label: 'ReadRow', args: ['sheetName', 'rowNumber'] },
                { id: 'ReadSheet', label: 'ReadSheet', args: ['sheetName'] },
                { id: 'ReadWithExactFilter', label: 'ReadWithExactFilter', args: ['sheetName', 'colID', 'value'] },
                { id: 'ReadWithPartialFilter', label: 'ReadWithPartialFilter', args: ['sheetName', 'colID', 'value'] },
                { id: 'RemoveColumn', label: 'RemoveColumn', args: ['sheetName', 'column'] },
                { id: 'RemoveRow', label: 'RemoveRow', args: ['sheetName', 'rowNumber'] },
                { id: 'WriteCell', label: 'WriteCell', args: ['sheetName', 'cellReference', 'data'] },
                { id: 'WriteColumn', label: 'WriteColumn', args: ['sheetName', 'column', 'data'] },
                { id: 'WriteRange', label: 'WriteRange', args: ['sheetName', 'rangeReference', 'data'] },
                { id: 'WriteRow', label: 'WriteRow', args: ['sheetName', 'rowNumber', 'data'] }
            ];
        }
        if (type === 'TINY_DB') {
            return [
                { id: 'ClearAll', label: 'ClearAll', args: [] },
                { id: 'ClearTag', label: 'ClearTag', args: ['tag'] },
                { id: 'GetEntries', label: 'GetEntries', args: [] },
                { id: 'GetTags', label: 'GetTags', args: [] },
                { id: 'GetValue', label: 'GetValue', args: ['tag', 'valueIfTagNotThere'] },
                { id: 'StoreValue', label: 'StoreValue', args: ['tag', 'valueToStore'] }
            ];
        }
        if (type === 'TINY_WEB_DB') {
            return [
                { id: 'GetValue', label: 'GetValue', args: ['tag'] },
                { id: 'StoreValue', label: 'StoreValue', args: ['tag', 'valueToStore'] }
            ];
        }
        // --- End Storage Methods ---

        // --- Map Methods ---
        if (type === 'MAP') return [
            { id: 'CreateMarker', label: 'CreateMarker', args: ['latitude', 'longitude'] },
            { id: 'FeatureFromDescription', label: 'FeatureFromDescription', args: ['description'] },
            { id: 'LoadFromURL', label: 'LoadFromURL', args: ['url'] },
            { id: 'PanTo', label: 'PanTo', args: ['latitude', 'longitude', 'zoom'] },
            { id: 'Save', label: 'Save', args: ['path'] }
        ];
        if (['MARKER', 'CIRCLE', 'POLYGON', 'RECTANGLE', 'LINE_STRING'].includes(type)) {
            const baseMethods = [
                { id: 'DistanceToFeature', label: 'DistanceToFeature', args: ['mapFeature', 'centroids'] },
                { id: 'DistanceToPoint', label: 'DistanceToPoint', args: ['latitude', 'longitude', 'centroid'] },
                { id: 'HideInfobox', label: 'HideInfobox' },
                { id: 'ShowInfobox', label: 'ShowInfobox' }
            ];
            if (type === 'MARKER') return [...baseMethods, { id: 'BearingToFeature', label: 'BearingToFeature', args: ['mapFeature', 'centroids'] }, { id: 'BearingToPoint', label: 'BearingToPoint', args: ['latitude', 'longitude'] }];
            if (type === 'CIRCLE') return [...baseMethods, { id: 'SetLocation', label: 'SetLocation', args: ['latitude', 'longitude'] }];
            if (type === 'POLYGON') return [...baseMethods, { id: 'Centroid', label: 'Centroid' }];
            if (type === 'RECTANGLE') return [...baseMethods, { id: 'Bounds', label: 'Bounds' }, { id: 'Center', label: 'Center' }, { id: 'SetCenter', label: 'SetCenter', args: ['latitude', 'longitude'] }];
            return baseMethods;
        }
        if (type === 'FEATURE_COLLECTION') return [{ id: 'FeatureFromDescription', label: 'FeatureFromDescription', args: ['description'] }, { id: 'LoadFromURL', label: 'LoadFromURL', args: ['url'] }];
        if (type === 'NAVIGATION') return [{ id: 'RequestDirections', label: 'RequestDirections' }];
        // --- End Map Methods ---

        // --- Chart Methods ---
        if (type === 'CHART') return [
            { id: 'ExtendDomainToInclude', label: 'ExtendDomainToInclude', args: ['x'] },
            { id: 'ExtendRangeToInclude', label: 'ExtendRangeToInclude', args: ['y'] },
            { id: 'ResetAxes', label: 'ResetAxes' },
            { id: 'SetDomain', label: 'SetDomain', args: ['minimum', 'maximum'] },
            { id: 'SetRange', label: 'SetRange', args: ['minimum', 'maximum'] }
        ];
        if (type === 'CHART_DATA_2D') return [
            { id: 'AddEntry', label: 'AddEntry', args: ['x', 'y'] },
            { id: 'ChangeDataSource', label: 'ChangeDataSource', args: ['source', 'keyValue'] },
            { id: 'Clear', label: 'Clear' },
            { id: 'DoesEntryExist', label: 'DoesEntryExist', args: ['x', 'y'] },
            { id: 'GetAllEntries', label: 'GetAllEntries' },
            { id: 'GetEntriesWithXValue', label: 'GetEntriesWithXValue', args: ['x'] },
            { id: 'GetEntriesWithYValue', label: 'GetEntriesWithYValue', args: ['y'] },
            { id: 'HighlightDataPoints', label: 'HighlightDataPoints', args: ['dataPoints', 'color'] },
            { id: 'ImportFromCloudDB', label: 'ImportFromCloudDB', args: ['cloudDB', 'tag'] },
            { id: 'ImportFromDataFile', label: 'ImportFromDataFile', args: ['dataFile', 'xValueColumn', 'yValueColumn'] },
            { id: 'ImportFromList', label: 'ImportFromList', args: ['list'] },
            { id: 'ImportFromSpreadsheet', label: 'ImportFromSpreadsheet', args: ['spreadsheet', 'xColumn', 'yColumn', 'useHeaders'] },
            { id: 'ImportFromTinyDB', label: 'ImportFromTinyDB', args: ['tinyDB', 'tag'] },
            { id: 'ImportFromWeb', label: 'ImportFromWeb', args: ['web', 'xValueColumn', 'yValueColumn'] },
            { id: 'RemoveDataSource', label: 'RemoveDataSource' },
            { id: 'RemoveEntry', label: 'RemoveEntry', args: ['x', 'y'] }
        ];
        if (type === 'TRENDLINE') return [{ id: 'DisconnectFromChartData', label: 'DisconnectFromChartData', args: [] }, { id: 'GetResultValue', label: 'GetResultValue', args: ['value'] }];
        // --- End Chart Methods ---

        // --- Data Science Methods ---
        if (type === 'ANOMALY_DETECTION') return [
            { id: 'CleanData', label: 'CleanData', args: ['anomaly', 'xList', 'yList'] },
            { id: 'DetectAnomalies', label: 'DetectAnomalies', args: ['dataList', 'threshold'] },
            { id: 'DetectAnomaliesInChartData', label: 'DetectAnomaliesInChartData', args: ['chartData', 'threshold'] }
        ];
        if (type === 'REGRESSION') return [
            { id: 'CalculateLineOfBestFitValue', label: 'CalculateLineOfBestFitValue', args: ['xList', 'yList', 'value'] }
        ];
        // --- End Data Science Methods ---

        // --- Social Methods ---
        if (['CONTACT_PICKER', 'PHONE_NUMBER_PICKER'].includes(type)) {
            return [
                { id: 'Open', label: 'Open', args: [] },
                { id: 'ViewContact', label: 'ViewContact', args: ['uri'] }
            ];
        }
        if (type === 'EMAIL_PICKER') {
            return [
                { id: 'MoveCursorTo', label: 'MoveCursorTo', args: ['position'] },
                { id: 'MoveCursorToEnd', label: 'MoveCursorToEnd', args: [] },
                { id: 'MoveCursorToStart', label: 'MoveCursorToStart', args: [] },
                { id: 'RequestFocus', label: 'RequestFocus', args: [] }
            ];
        }
        if (type === 'PHONE_CALL') {
            return [
                { id: 'MakePhoneCall', label: 'MakePhoneCall', args: [] },
                { id: 'MakePhoneCallDirect', label: 'MakePhoneCallDirect', args: [] }
            ];
        }
        if (type === 'SHARING') {
            return [
                { id: 'ShareFile', label: 'ShareFile', args: ['file'] },
                { id: 'ShareFileWithMessage', label: 'ShareFileWithMessage', args: ['file', 'message'] },
                { id: 'ShareMessage', label: 'ShareMessage', args: ['message'] }
            ];
        }
        if (type === 'TEXTING') {
            return [
                { id: 'SendMessage', label: 'SendMessage', args: [] },
                { id: 'SendMessageDirect', label: 'SendMessageDirect', args: [] }
            ];
        }
        // --- End Social Methods ---

        // --- Drawing and Animation Methods ---
        if (type === 'CANVAS') {
            return [
                { id: 'Clear', label: 'Clear', args: [] },
                { id: 'DrawArc', label: 'DrawArc', args: ['left', 'top', 'right', 'bottom', 'startAngle', 'sweepAngle', 'useCenter', 'fill'] },
                { id: 'DrawCircle', label: 'DrawCircle', args: ['centerX', 'centerY', 'radius', 'fill'] },
                { id: 'DrawLine', label: 'DrawLine', args: ['x1', 'y1', 'x2', 'y2'] },
                { id: 'DrawPoint', label: 'DrawPoint', args: ['x', 'y'] },
                { id: 'DrawShape', label: 'DrawShape', args: ['pointList', 'fill'] },
                { id: 'DrawText', label: 'DrawText', args: ['text', 'x', 'y'] },
                { id: 'DrawTextAtAngle', label: 'DrawTextAtAngle', args: ['text', 'x', 'y', 'angle'] },
                { id: 'Save', label: 'Save', args: [] },
                { id: 'SaveAs', label: 'SaveAs', args: ['fileName'] }
            ];
        }
        if (type === 'BALL' || type === 'IMAGE_SPRITE') {
            return [
                { id: 'Bounce', label: 'Bounce', args: ['edge'] },
                { id: 'CollidingWith', label: 'CollidingWith', args: ['other'] },
                { id: 'MoveIntoBounds', label: 'MoveIntoBounds', args: [] },
                { id: 'MoveTo', label: 'MoveTo', args: ['x', 'y'] },
                { id: 'PointInDirection', label: 'PointInDirection', args: ['x', 'y'] },
                { id: 'PointTowards', label: 'PointTowards', args: ['target'] }
            ];
        }
        // --- End Drawing and Animation Methods ---

        // --- Connectivity Methods ---
        if (type === 'ACTIVITY_STARTER') {
            return [
                { id: 'ResolveActivity', label: 'ResolveActivity', args: [] },
                { id: 'StartActivity', label: 'StartActivity', args: [] }
            ];
        }
        if (type === 'BLUETOOTH_CLIENT' || type === 'BLUETOOTH_SERVER') {
            const common = [
                { id: 'BytesAvailableToReceive', label: 'BytesAvailableToReceive', args: [] },
                { id: 'Disconnect', label: 'Disconnect', args: [] },
                { id: 'ReceiveSigned1ByteNumber', label: 'ReceiveSigned1ByteNumber', args: [] },
                { id: 'ReceiveText', label: 'ReceiveText', args: ['numberOfBytes'] },
                { id: 'Send1ByteNumber', label: 'Send1ByteNumber', args: ['number'] },
                { id: 'SendText', label: 'SendText', args: ['text'] }
            ];
            if (type === 'BLUETOOTH_CLIENT') {
                return [
                    ...common,
                    { id: 'Connect', label: 'Connect', args: ['address'] },
                    { id: 'ConnectWithUUID', label: 'ConnectWithUUID', args: ['address', 'uuid'] },
                    { id: 'IsDevicePaired', label: 'IsDevicePaired', args: ['address'] }
                ];
            } else {
                return [
                    ...common,
                    { id: 'AcceptConnection', label: 'AcceptConnection', args: ['serviceName'] },
                    { id: 'AcceptConnectionWithUUID', label: 'AcceptConnectionWithUUID', args: ['serviceName', 'uuid'] },
                    { id: 'StopAccepting', label: 'StopAccepting', args: [] }
                ];
            }
        }
        if (type === 'SERIAL') {
            return [
                { id: 'CloseSerial', label: 'CloseSerial', args: [] },
                { id: 'InitializeSerial', label: 'InitializeSerial', args: [] },
                { id: 'OpenSerial', label: 'OpenSerial', args: [] },
                { id: 'PrintSerial', label: 'PrintSerial', args: ['data'] },
                { id: 'ReadSerial', label: 'ReadSerial', args: [] },
                { id: 'WriteSerial', label: 'WriteSerial', args: ['data'] }
            ];
        }
        if (type === 'WEB') {
            return [
                { id: 'Get', label: 'Get', args: [] },
                { id: 'PostText', label: 'PostText', args: ['text'] },
                { id: 'PutText', label: 'PutText', args: ['text'] },
                { id: 'Delete', label: 'Delete', args: [] },
                { id: 'BuildRequestData', label: 'BuildRequestData', args: ['list'] },
                { id: 'ClearCookies', label: 'ClearCookies', args: [] },
                { id: 'JsonTextDecode', label: 'JsonTextDecode', args: ['jsonText'] },
                { id: 'UriEncode', label: 'UriEncode', args: ['text'] },
                { id: 'XMLTextDecode', label: 'XMLTextDecode', args: ['xmlText'] }
            ];
        }
        // --- End Connectivity Methods ---

        if (type === 'DATE_PICKER') {
            return [
                { id: 'LaunchPicker', label: 'LaunchPicker', args: [] },
                { id: 'SetDateToDisplay', label: 'SetDateToDisplay', args: ['year', 'month', 'day'] },
                { id: 'SetDateToDisplayFromInstant', label: 'SetDateToDisplayFromInstant', args: ['instant'] }
            ];
        }
        if (type === 'LIST_PICKER') {
            return [
                { id: 'Open', label: 'Open', args: [] }
            ];
        }
        if (type === 'LIST_VIEW') {
            return [
                { id: 'AddItem', label: 'AddItem', args: ['mainText', 'detailText', 'imageName'] },
                { id: 'AddItemAtIndex', label: 'AddItemAtIndex', args: ['index', 'mainText', 'detailText', 'imageName'] },
                { id: 'AddItems', label: 'AddItems', args: ['itemsList'] },
                { id: 'AddItemsAtIndex', label: 'AddItemsAtIndex', args: ['index', 'itemsList'] },
                { id: 'CreateElement', label: 'CreateElement', args: ['mainText', 'detailText', 'imageName'] },
                { id: 'GetDetailText', label: 'GetDetailText', args: ['listElement'] },
                { id: 'GetImageName', label: 'GetImageName', args: ['listElement'] },
                { id: 'GetMainText', label: 'GetMainText', args: ['listElement'] },
                { id: 'RemoveItemAtIndex', label: 'RemoveItemAtIndex', args: ['index'] }
            ];
        }
        if (type === 'NOTIFIER') {
            return [
                { id: 'DismissProgressDialog', label: 'DismissProgressDialog', args: [] },
                { id: 'LogError', label: 'LogError', args: ['message'] },
                { id: 'LogInfo', label: 'LogInfo', args: ['message'] },
                { id: 'LogWarning', label: 'LogWarning', args: ['message'] },
                { id: 'ShowAlert', label: 'ShowAlert', args: ['notice'] },
                { id: 'ShowChooseDialog', label: 'ShowChooseDialog', args: ['message', 'title', 'button1Text', 'button2Text', 'cancelable'] },
                { id: 'ShowMessageDialog', label: 'ShowMessageDialog', args: ['message', 'title', 'buttonText'] },
                { id: 'ShowPasswordDialog', label: 'ShowPasswordDialog', args: ['message', 'title', 'cancelable'] },
                { id: 'ShowProgressDialog', label: 'ShowProgressDialog', args: ['message', 'title'] },
                { id: 'ShowTextDialog', label: 'ShowTextDialog', args: ['message', 'title', 'cancelable'] }
            ];
        }
        if (type === 'PASSWORD_TEXT') {
            return [
                { id: 'MoveCursorTo', label: 'MoveCursorTo', args: ['position'] },
                { id: 'MoveCursorToEnd', label: 'MoveCursorToEnd', args: [] },
                { id: 'MoveCursorToStart', label: 'MoveCursorToStart', args: [] },
                { id: 'RequestFocus', label: 'RequestFocus', args: [] }
            ];
        }
        if (type === 'DROPDOWN') {
            return [
                { id: 'DisplayDropdown', label: 'DisplayDropdown', args: [] }
            ];
        }
        if (['TEXT_INPUT', 'TEXT_AREA'].includes(type)) {
            return [
                { id: 'HideKeyboard', label: 'HideKeyboard', args: [] },
                { id: 'MoveCursorTo', label: 'MoveCursorTo', args: ['position'] },
                { id: 'MoveCursorToEnd', label: 'MoveCursorToEnd', args: [] },
                { id: 'MoveCursorToStart', label: 'MoveCursorToStart', args: [] },
                { id: 'RequestFocus', label: 'RequestFocus', args: [] }
            ];
        }
        if (type === 'DATETIME_PICKER') {
            return [
                { id: 'LaunchPicker', label: 'LaunchPicker', args: [] },
                { id: 'SetTimeToDisplay', label: 'SetTimeToDisplay', args: ['hour', 'minute'] },
                { id: 'SetTimeToDisplayFromInstant', label: 'SetTimeToDisplayFromInstant', args: ['instant'] }
            ];
        }
        if (type === 'EMBED_WEB') {
            return [
                { id: 'CanGoBack', label: 'CanGoBack', args: [] },
                { id: 'CanGoForward', label: 'CanGoForward', args: [] },
                { id: 'ClearCaches', label: 'ClearCaches', args: [] },
                { id: 'ClearCookies', label: 'ClearCookies', args: [] },
                { id: 'ClearLocations', label: 'ClearLocations', args: [] },
                { id: 'GoBack', label: 'GoBack', args: [] },
                { id: 'GoForward', label: 'GoForward', args: [] },
                { id: 'GoHome', label: 'GoHome', args: [] },
                { id: 'GoToUrl', label: 'GoToUrl', args: ['url'] },
                { id: 'Reload', label: 'Reload', args: [] },
                { id: 'RunJavaScript', label: 'RunJavaScript', args: ['js'] },
                { id: 'StopLoading', label: 'StopLoading', args: [] }
            ];
        }
        if (type === 'SIGNATURE_PAD') {
            return [
                { id: 'Clear', label: 'Clear', args: [] },
                { id: 'GetBase64', label: 'GetBase64', args: [] }
            ];
        }
        if (type === 'MULTI_SELECT') {
            return [
                { id: 'SetOptions', label: 'SetOptions', args: ['optionsList'] },
                { id: 'SetSelection', label: 'SetSelection', args: ['selectionList'] }
            ];
        }
        if (type === 'TABLE_AGGREGATION') {
            return [
                { id: 'Refresh', label: 'Refresh', args: [] }
            ];
        }
        if (type === 'RECORD_DISPLAY') {
            return [
                { id: 'LoadRecord', label: 'LoadRecord', args: ['recordId'] }
            ];
        }
        return [];
    };

    const getToolbox = (steps, appVariables, currentStep, activeScope, baseComponents = []) => {
        const categories = [
            {
                kind: 'category',
                name: 'Step Triggers',
                colour: BLOCK_COLORS.MAVI_SCREEN,
                contents: [
                    { kind: 'block', type: 'step_initialize' },
                    { kind: 'block', type: 'step_back_pressed' },
                    { kind: 'block', type: 'step_error_occurred' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'set_step_property' },
                    { kind: 'block', type: 'get_step_property' }
                ]
            },
            {
                kind: 'category',
                name: 'Device Triggers',
                colour: BLOCK_COLORS.MAVI_TRIGGER,
                contents: [
                    { kind: 'block', type: 'trigger_when_device' },
                    { kind: 'block', type: 'trigger_when_timer' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'get_event_parameter' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'action_run_connector' },
                    { kind: 'block', type: 'action_show_error' }
                ]
            },
            {
                kind: 'category',
                name: 'App Transitions',
                colour: '#6366f1',
                contents: [
                    { kind: 'block', type: 'transition_go_to_step' },
                    { kind: 'block', type: 'transition_next_step' },
                    { kind: 'block', type: 'transition_complete_app' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'action_send_alert' }
                ]
            },
            {
                kind: 'category',
                name: 'Drawing and Animation',
                colour: '#f43f5e',
                contents: [
                    { kind: 'label', text: 'Canvas Control' },
                    { kind: 'block', type: 'call_universal_method', extraState: { type: 'CANVAS' } },
                    { kind: 'sep' },
                    { kind: 'label', text: 'Sprite Intelligence' },
                    { kind: 'block', type: 'call_universal_method', extraState: { type: 'BALL' } },
                    { kind: 'block', type: 'call_universal_method', extraState: { type: 'IMAGE_SPRITE' } }
                ]
            },
            {
                kind: 'category',
                name: 'Logic Data',
                colour: BLOCK_COLORS.LOGIC,
                contents: [
                    { kind: 'block', type: 'get_event_parameter' }
                ]
            },
            {
                kind: 'category',
                name: 'Control',
                colour: BLOCK_COLORS.CONTROL,
                contents: [
                    { kind: 'block', type: 'controls_if' },
                    { kind: 'block', type: 'control_choose' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'control_for_range' },
                    { kind: 'block', type: 'control_for_each' },
                    { kind: 'block', type: 'control_for_each_dict' },
                    { kind: 'block', type: 'control_while' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'control_do_with_result' },
                    { kind: 'block', type: 'control_evaluate_ignore' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'control_open_step' },
                    { kind: 'block', type: 'control_open_step_with_value' },
                    { kind: 'block', type: 'control_get_start_value' },
                    { kind: 'block', type: 'control_close_step' },
                    { kind: 'block', type: 'control_close_step_with_value' },
                    { kind: 'block', type: 'control_close_app' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'control_break' }
                ]
            },
            {
                kind: 'category',
                name: 'Logic',
                colour: BLOCK_COLORS.LOGIC,
                contents: [
                    { kind: 'block', type: 'logic_compare' },
                    { kind: 'block', type: 'logic_operation' },
                    { kind: 'block', type: 'logic_negate' },
                    { kind: 'block', type: 'logic_boolean' },
                    { kind: 'block', type: 'logic_null' }
                ]
            },
            {
                kind: 'category',
                name: 'Math',
                colour: BLOCK_COLORS.MATH,
                contents: [
                    { kind: 'block', type: 'math_number' },
                    { kind: 'block', type: 'math_arithmetic' },
                    { kind: 'block', type: 'math_single' },
                    { kind: 'block', type: 'math_trig' },
                    { kind: 'block', type: 'math_constant' },
                    { kind: 'block', type: 'math_number_property' },
                    { kind: 'block', type: 'math_round' },
                    { kind: 'block', type: 'math_on_list' },
                    { kind: 'block', type: 'math_modulo' },
                    { kind: 'block', type: 'math_constrain' },
                    { kind: 'block', type: 'math_random_int' },
                    { kind: 'block', type: 'math_random_float' }
                ]
            },
            {
                kind: 'category',
                name: 'Text',
                colour: BLOCK_COLORS.TEXT,
                contents: [
                    { kind: 'block', type: 'text' },
                    { kind: 'block', type: 'text_join' },
                    { kind: 'block', type: 'text_append' },
                    { kind: 'block', type: 'text_length' },
                    { kind: 'block', type: 'text_isEmpty' },
                    { kind: 'block', type: 'text_indexOf' },
                    { kind: 'block', type: 'text_charAt' },
                    { kind: 'block', type: 'text_getSubstring' },
                    { kind: 'block', type: 'text_changeCase' },
                    { kind: 'block', type: 'text_trim' },
                    { kind: 'block', type: 'text_print' }
                ]
            },
            {
                kind: 'category',
                name: 'Lists',
                colour: BLOCK_COLORS.LISTS,
                contents: [
                    { kind: 'block', type: 'lists_create_with' },
                    { kind: 'block', type: 'lists_repeat' },
                    { kind: 'block', type: 'lists_length' },
                    { kind: 'block', type: 'lists_isEmpty' },
                    { kind: 'block', type: 'lists_indexOf' },
                    { kind: 'block', type: 'lists_getIndex' },
                    { kind: 'block', type: 'lists_setIndex' },
                    { kind: 'block', type: 'lists_getSublist' },
                    { kind: 'block', type: 'lists_split' },
                    { kind: 'block', type: 'lists_sort' }
                ]
            },
            {
                kind: 'category',
                name: 'Colors',
                colour: BLOCK_COLORS.COLORS,
                contents: [
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#000000' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#444444' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#888888' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#CCCCCC' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#FFFFFF' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#FF0000' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#FFAFAF' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#FFC800' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#FFFF00' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#00FF00' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#00FFFF' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#0000FF' } },
                    { kind: 'block', type: 'color_basic', fields: { 'COLOR': '#FF00FF' } },
                    { kind: 'block', type: 'color_make' },
                    { kind: 'block', type: 'color_split' }
                ]
            },
            {
                kind: 'category',
                name: 'Dictionaries',
                colour: BLOCK_COLORS.DICTIONARIES,
                contents: [
                    { kind: 'block', type: 'dict_create' },
                    { kind: 'block', type: 'dict_pair' },
                    { kind: 'block', type: 'lists_create_with' },
                    { kind: 'block', type: 'dict_get' },
                    { kind: 'block', type: 'dict_lookup_default' },
                    { kind: 'block', type: 'dict_set' },
                    { kind: 'block', type: 'dict_contains_key' },
                    { kind: 'block', type: 'dict_remove_key' },
                    { kind: 'block', type: 'dict_keys' },
                    { kind: 'block', type: 'dict_values' }
                ]
            },
            {
                kind: 'category',
                name: 'Variables',
                colour: BLOCK_COLORS.VARIABLES,
                contents: [
                    { kind: 'block', type: 'variables_global_declaration' },
                    { kind: 'block', type: 'variables_get' },
                    { kind: 'block', type: 'variables_set' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'variables_local_declaration_statement' },
                    { kind: 'block', type: 'variables_local_declaration_expression' },
                    { kind: 'sep' },
                    { kind: 'block', type: 'event_variable_changed' }
                ]
            },
            {
                kind: 'category',
                name: 'Procedures',
                colour: BLOCK_COLORS.PROCEDURES,
                custom: 'PROCEDURE_AI'
            },
            { kind: 'sep' },
            {
                kind: 'category',
                name: 'App Triggers',
                colour: BLOCK_COLORS.COMPONENTS,
                contents: [
                    { kind: 'block', type: 'event_app_start' },
                    { kind: 'block', type: 'event_step_enter' },
                    { kind: 'block', type: 'event_step_exit' }
                ]
            },
            {
                kind: 'category',
                name: 'Any Component',
                colour: BLOCK_COLORS.COMPONENTS,
                contents: [
                    { kind: 'block', type: 'widget_selector' },
                    { kind: 'block', type: 'set_universal_property' },
                    { kind: 'block', type: 'get_universal_property' },
                    { kind: 'block', type: 'call_universal_method' }
                ]
            },
        ];

        // Add Individual Widget Categories
        const allRelevantComponents = [
            ...baseComponents,
            ...(activeScope === 'STEP' && currentStep ? currentStep.components : [])
        ];

        allRelevantComponents.forEach(comp => {
            const label = comp.name || comp.props.label || comp.props.text || comp.type;

            const eventBlocks = getEventTypesForComponent(comp.type).map(evt => ({
                kind: 'block',
                type: `event_widget_${comp.id}_${evt.id}`
            }));

            categories.push({
                kind: 'category',
                name: label,
                colour: BLOCK_COLORS.COMPONENTS,
                contents: [
                    ...eventBlocks,
                    { kind: 'block', type: `instance_widget_${comp.id}` },
                    { kind: 'block', type: `setter_widget_${comp.id}` },
                    { kind: 'block', type: `getter_widget_${comp.id}` },
                    ...getMethodsForComponent(comp.type).map(method => ({
                        kind: 'block',
                        type: `method_widget_${comp.id}_${method.id}`
                    }))
                ]
            });
        });

        return {
            kind: 'categoryToolbox',
            contents: categories
        };
    };

    const saveWorkspace = async () => {
        if (!workspace.current) return;
        if (isSavingLogic) return;

        if (saveProgressTimerRef.current) clearInterval(saveProgressTimerRef.current);
        if (saveResetTimerRef.current) clearTimeout(saveResetTimerRef.current);

        setIsSavingLogic(true);
        setSaveStatus('saving');
        setSaveProgress(12);

        saveProgressTimerRef.current = setInterval(() => {
            setSaveProgress((prev) => (prev >= 90 ? 90 : prev + Math.max(2, Math.round((90 - prev) * 0.15))));
        }, 90);

        const xml = Blockly.Xml.workspaceToDom(workspace.current);
        const xmlText = Blockly.Xml.domToText(xml);
        const code = javascriptGenerator.workspaceToCode(workspace.current);

        try {
            if (activeScope === 'GLOBAL') {
                await Promise.resolve(onUpdateGlobalLogic(xmlText, code));
            } else {
                await Promise.resolve(onUpdateStepLogic(currentStepId, xmlText, code));
            }

            if (saveProgressTimerRef.current) clearInterval(saveProgressTimerRef.current);
            setSaveProgress(100);
            setSaveStatus('saved');
            setIsSavingLogic(false);

            saveResetTimerRef.current = setTimeout(() => {
                setSaveStatus('idle');
                setSaveProgress(0);
            }, 1200);
        } catch (error) {
            console.error('Failed to save Blockly logic:', error);
            if (saveProgressTimerRef.current) clearInterval(saveProgressTimerRef.current);
            setSaveStatus('error');
            setIsSavingLogic(false);

            saveResetTimerRef.current = setTimeout(() => {
                setSaveStatus('idle');
                setSaveProgress(0);
            }, 1800);
        }
    };

    const handleApplyXml = async (xmlString, options = {}) => {
        if (!workspace.current || !xmlString) return;
        try {
            // 1. Normalize incoming XML/snippet
            let processedXml = String(xmlString).trim();
            processedXml = processedXml
                .replace(/```xml\s*/gi, '')
                .replace(/```/g, '')
                .trim();

            // Accept either full <xml>...</xml> or one/more <block ...> snippets.
            if (!/^<xml[\s>]/i.test(processedXml)) {
                processedXml = `<xml xmlns="https://developers.google.com/blockly/xml">${processedXml}</xml>`;
            }

            // Guard: parsererror from malformed XML
            const parser = new DOMParser();
            const parsed = parser.parseFromString(processedXml, 'text/xml');
            if (parsed.getElementsByTagName('parsererror').length > 0) {
                throw new Error('XML tidak valid. Pastikan format block XML benar.');
            }

            // 2) Sanitize AI-generated block types to match available dynamic Blockly types
            const validTypes = new Set(Object.keys(Blockly.Blocks || {}));
            const allBlocks = Array.from(parsed.getElementsByTagName('block'));
            let unsupportedCount = 0;
            const existingWidgetIds = new Set([
                ...(baseComponents || []).map(c => c.id),
                ...(currentStep?.components || []).map(c => c.id)
            ]);
            const widgetIdMap = {};

            const getFieldValue = (blockEl, fieldName) => {
                const fields = Array.from(blockEl.getElementsByTagName('field'));
                const found = fields.find((f) => (f.getAttribute('name') || '').toUpperCase() === String(fieldName || '').toUpperCase());
                return found?.textContent?.trim() || '';
            };

            const inferEventId = (raw = '') => {
                const t = String(raw || '').toLowerCase();
                if (!t) return 'Click';
                if (t.includes('change')) return 'ON_CHANGE';
                if (t.includes('submit')) return 'ON_SUBMIT';
                if (t.includes('click')) return 'Click';
                return 'Click';
            };

            const remapWidgetIdInType = (type, fromId, toId) => {
                if (!type || !fromId || !toId) return type;
                let next = String(type);
                next = next
                    .replace(`_widget_${fromId}_`, `_widget_${toId}_`)
                    .replace(new RegExp(`_widget_${fromId}$`), `_widget_${toId}`);
                if (validTypes.has(next)) return next;

                // Event block fallback candidates
                if (next.startsWith('event_widget_')) {
                    const fallbackCandidates = [
                        `event_widget_${toId}_Click`,
                        `event_widget_${toId}_ON_CLICK`,
                        `event_widget_${toId}_ON_CHANGE`
                    ];
                    const hit = fallbackCandidates.find((c) => validTypes.has(c));
                    if (hit) return hit;
                }
                return next;
            };

            const registerDynamicEventBlocks = (widgetId, widgetLabel = 'AI Widget') => {
                if (!widgetId) return;
                const eventTypes = getEventTypesForComponent('BUTTON') || [];
                eventTypes.forEach((evt) => {
                    const triggerBlockName = `event_widget_${widgetId}_${evt.id}`;
                    if (!Blockly.Blocks[triggerBlockName]) {
                        Blockly.Blocks[triggerBlockName] = {
                            init: function () {
                                this.appendDummyInput().appendField(`When ${widgetLabel} ${evt.label}`);
                                const args = evt.args || [];
                                if (args.length > 0) {
                                    this.appendDummyInput().appendField(`(${args.join(', ')})`).setAlign(Blockly.inputs.Align.RIGHT);
                                }
                                this.appendStatementInput("STACK").setCheck(null).appendField("do");
                                this.setColour(BLOCK_COLORS.COMPONENTS);
                                this.setInputsInline(false);
                                if (this.setHat) this.setHat(true);
                            }
                        };
                    }
                    if (!javascriptGenerator.forBlock[triggerBlockName]) {
                        javascriptGenerator.forBlock[triggerBlockName] = function (block) {
                            const branch = javascriptGenerator.statementToCode(block, 'STACK');
                            return `// TRIGGER: WIDGET_EVENT:${widgetId}:${evt.id}\n${branch}`;
                        };
                    }
                    validTypes.add(triggerBlockName);
                });
            };

            const ensureWidgetForId = async (wantedId, preferredType = 'BUTTON') => {
                const id = String(wantedId || '').trim();
                if (!id) return '';
                if (existingWidgetIds.has(id)) return id;
                if (widgetIdMap[id]) return widgetIdMap[id];
                if (options.fallbackWidgetId) {
                    widgetIdMap[id] = options.fallbackWidgetId;
                    registerDynamicEventBlocks(widgetIdMap[id], 'AI Widget');
                    return widgetIdMap[id];
                }
                if (!options.autoCreateMissing || typeof onCreateWidgetFromAi !== 'function') return '';

                const createdId = await Promise.resolve(onCreateWidgetFromAi({
                    type: preferredType,
                    idHint: id,
                    label: 'AI Widget',
                    text: 'AI Widget'
                }));
                if (createdId) {
                    widgetIdMap[id] = createdId;
                    existingWidgetIds.add(createdId);
                    registerDynamicEventBlocks(createdId, 'AI Widget');
                }
                return widgetIdMap[id] || '';
            };

            for (const blockEl of allBlocks) {
                if (!blockEl || typeof blockEl.getAttribute !== 'function') continue;
                let type = blockEl.getAttribute('type') || '';

                // Common AI pattern: "do" statement name from MIT-style examples
                if (String(type).startsWith('event_')) {
                    const doStmt = Array.from(blockEl.getElementsByTagName('statement')).find((s) => s.getAttribute('name') === 'DO');
                    if (doStmt) doStmt.setAttribute('name', 'STACK');
                }

                if (validTypes.has(type)) continue;

                // Map generic AI event blocks to actual dynamic event block ids
                if (
                    type === 'event_when' ||
                    type === 'when_button_click' ||
                    type === 'event_button_click' ||
                    /^when_.*click$/i.test(type)
                ) {
                    const widgetId =
                        getFieldValue(blockEl, 'WIDGET') ||
                        getFieldValue(blockEl, 'BUTTON') ||
                        getFieldValue(blockEl, 'COMPONENT');
                    const rawEvent = getFieldValue(blockEl, 'EVENT') || type;
                    const inferred = inferEventId(rawEvent);

                    let resolvedWidgetId = widgetId;
                    if (widgetId && !existingWidgetIds.has(widgetId)) {
                        const autoId = await ensureWidgetForId(widgetId, 'BUTTON');
                        if (autoId) resolvedWidgetId = autoId;
                    }

                    // If AI did not provide widget id, auto-create/use a button so we can keep widget-click semantics.
                    if (!resolvedWidgetId) {
                        const fallbackId =
                            options.fallbackWidgetId ||
                            (await ensureWidgetForId('ai_generated_button', 'BUTTON'));
                        if (fallbackId) resolvedWidgetId = fallbackId;
                    }

                    const candidates = [
                        `event_widget_${resolvedWidgetId}_${inferred}`,
                        `event_widget_${resolvedWidgetId}_Click`,
                        `event_widget_${resolvedWidgetId}_ON_CLICK`
                    ];
                    const mapped = candidates.find((c) => validTypes.has(c));
                    if (mapped) {
                        blockEl.setAttribute('type', mapped);
                        const fields = Array.from(blockEl.getElementsByTagName('field'));
                        fields.forEach((f) => {
                            const n = (f.getAttribute('name') || '').toUpperCase();
                            if (['WIDGET', 'BUTTON', 'COMPONENT'].includes(n) && resolvedWidgetId) {
                                f.textContent = resolvedWidgetId;
                            }
                        });
                        const doStmt = Array.from(blockEl.getElementsByTagName('statement')).find((s) => s.getAttribute('name') === 'DO');
                        if (doStmt) doStmt.setAttribute('name', 'STACK');
                        continue;
                    }

                    if (validTypes.has('event_app_start')) {
                        blockEl.setAttribute('type', 'event_app_start');
                        const doStmt = Array.from(blockEl.getElementsByTagName('statement')).find((s) => s.getAttribute('name') === 'DO');
                        if (doStmt) doStmt.setAttribute('name', 'STACK');
                        continue;
                    }
                }

                // If type references a widget id that doesn't exist, create one and remap.
                if (type.includes('_widget_')) {
                    const guessed =
                        type.match(/^event_widget_(.+)_[^_]+$/)?.[1] ||
                        type.match(/^(?:setter|getter|instance)_widget_(.+)$/)?.[1] ||
                        type.match(/^method_widget_(.+)_[^_]+$/)?.[1] ||
                        '';
                    if (guessed && !existingWidgetIds.has(guessed)) {
                        const created = await ensureWidgetForId(guessed, 'BUTTON');
                        if (created) {
                            const remappedType = remapWidgetIdInType(type, guessed, created);
                            if (validTypes.has(remappedType)) {
                                blockEl.setAttribute('type', remappedType);
                                type = remappedType;
                            }
                            const fields = Array.from(blockEl.getElementsByTagName('field'));
                            fields.forEach((f) => {
                                const n = (f.getAttribute('name') || '').toUpperCase();
                                if (['WIDGET', 'BUTTON', 'COMPONENT'].includes(n) && f.textContent === guessed) {
                                    f.textContent = created;
                                }
                            });
                            if (validTypes.has(type)) continue;
                        }
                    }
                }

                // Fallback: drop unsupported blocks instead of failing whole injection
                unsupportedCount += 1;
                if (blockEl.parentNode) blockEl.parentNode.removeChild(blockEl);
            }

            if (unsupportedCount > 0) {
                console.warn(`[Blockly AI] Dropped ${unsupportedCount} unsupported block(s) from suggestion.`);
            }

            const sanitizedXmlText = new XMLSerializer().serializeToString(parsed);

            // 2. Track existing blocks to identify new ones
            const existingIds = new Set(workspace.current.getAllBlocks(false).map(b => b.id));

            // 3. Inject with fallback for invalid <next> chains from AI
            try {
                const xml = Blockly.utils.xml.textToDom(sanitizedXmlText);
                Blockly.Xml.domToWorkspace(xml, workspace.current);
            } catch (injectErr) {
                const msg = String(injectErr?.message || '');
                const nextChainError = /Next block does not have previous statement/i.test(msg);
                if (!nextChainError) throw injectErr;

                const fallbackDoc = parser.parseFromString(sanitizedXmlText, 'text/xml');
                const xmlRoot = fallbackDoc.getElementsByTagName('xml')[0] || fallbackDoc.documentElement;
                const typeConnCache = new Map();
                const getTypeConn = (type) => {
                    const key = String(type || '');
                    if (typeConnCache.has(key)) return typeConnCache.get(key);
                    const empty = { hasPrev: false, hasNext: false, hasOutput: false };
                    if (!key || !Blockly.Blocks?.[key] || !workspace.current) {
                        typeConnCache.set(key, empty);
                        return empty;
                    }
                    let info = empty;
                    try {
                        Blockly.Events.disable();
                        const tmp = workspace.current.newBlock(key);
                        info = {
                            hasPrev: !!tmp.previousConnection,
                            hasNext: !!tmp.nextConnection,
                            hasOutput: !!tmp.outputConnection
                        };
                        tmp.dispose(false);
                    } catch {
                        info = empty;
                    } finally {
                        Blockly.Events.enable();
                    }
                    typeConnCache.set(key, info);
                    return info;
                };

                const isStatementType = (type) => {
                    const c = getTypeConn(type);
                    return c.hasPrev && !c.hasOutput;
                };

                const parentAllowsNext = (type) => {
                    const c = getTypeConn(type);
                    return c.hasNext;
                };

                const firstChildBlock = (node) => Array.from(node?.childNodes || []).find(
                    (n) => n.nodeType === 1 && String(n.nodeName).toLowerCase() === 'block'
                ) || null;

                const getDirectStatements = (blockEl) => Array.from(blockEl?.childNodes || []).filter(
                    (n) => n.nodeType === 1 && String(n.nodeName).toLowerCase() === 'statement'
                );

                const getNearestStatementTarget = (startBlockEl) => {
                    let cursor = startBlockEl;
                    while (cursor && String(cursor.nodeName).toLowerCase() === 'block') {
                        const statements = getDirectStatements(cursor);
                        const preferred = statements.find((s) => ['STACK', 'DO'].includes(String(s.getAttribute('name') || '').toUpperCase()));
                        if (preferred) return preferred;
                        if (statements.length > 0) return statements[0];

                        // climb to parent block
                        let p = cursor.parentNode;
                        while (p && String(p.nodeName).toLowerCase() !== 'block') p = p.parentNode;
                        cursor = p;
                    }
                    return null;
                };

                const appendBlockToStatementTail = (statementEl, blockEl) => {
                    if (!statementEl || !blockEl) return false;
                    const head = firstChildBlock(statementEl);
                    if (!head) {
                        statementEl.appendChild(blockEl);
                        return true;
                    }
                    let tail = head;
                    let guard = 0;
                    while (guard < 1000) {
                        const nextEl = Array.from(tail.childNodes || []).find(
                            (n) => n.nodeType === 1 && String(n.nodeName).toLowerCase() === 'next'
                        );
                        const nextBlock = firstChildBlock(nextEl);
                        if (!nextBlock) break;
                        tail = nextBlock;
                        guard += 1;
                    }
                    const tailType = tail.getAttribute('type') || '';
                    if (!parentAllowsNext(tailType)) return false;
                    const nextNode = fallbackDoc.createElement('next');
                    nextNode.appendChild(blockEl);
                    tail.appendChild(nextNode);
                    return true;
                };

                const nextNodes = Array.from(fallbackDoc.getElementsByTagName('next'));
                nextNodes.forEach((nextEl) => {
                    const parentBlock = nextEl?.parentNode && String(nextEl.parentNode.nodeName).toLowerCase() === 'block'
                        ? nextEl.parentNode
                        : null;
                    const childBlock = firstChildBlock(nextEl);
                    if (!childBlock) {
                        if (nextEl.parentNode) nextEl.parentNode.removeChild(nextEl);
                        return;
                    }

                    const pType = parentBlock?.getAttribute('type') || '';
                    const cType = childBlock.getAttribute('type') || '';
                    const validDirectNext = parentAllowsNext(pType) && isStatementType(cType);

                    if (validDirectNext) return;

                    // Detach invalid next chain child
                    nextEl.removeChild(childBlock);
                    if (nextEl.parentNode) nextEl.parentNode.removeChild(nextEl);

                    // Try to reattach to nearest statement input (STACK/DO preferred)
                    let attached = false;
                    if (isStatementType(cType) && parentBlock) {
                        const stmtTarget = getNearestStatementTarget(parentBlock);
                        if (stmtTarget) {
                            attached = appendBlockToStatementTail(stmtTarget, childBlock);
                        }
                    }

                    // Last resort: keep as top-level block
                    if (!attached && xmlRoot) {
                        xmlRoot.appendChild(childBlock);
                    }
                });

                const fallbackXmlText = new XMLSerializer().serializeToString(fallbackDoc);
                const fallbackXml = Blockly.utils.xml.textToDom(fallbackXmlText);
                Blockly.Xml.domToWorkspace(fallbackXml, workspace.current);
                console.warn('[Blockly AI] Recovered from invalid <next> chain with smart repair.');
            }

            // 4. Find new blocks and center them
            const newBlocks = workspace.current.getAllBlocks(false).filter(b => !existingIds.has(b.id));

            if (newBlocks.length > 0) {
                const metrics = workspace.current.getMetrics();
                // Determine center point in workspace coordinates
                const centerX = metrics.viewLeft + metrics.viewWidth / 2;
                const centerY = metrics.viewTop + metrics.viewHeight / 2;

                // Move top-level new blocks to the center
                newBlocks.forEach(block => {
                    if (!block.getParent()) {
                        block.moveTo(new Blockly.utils.Coordinate(centerX - 100, centerY - 50));
                    }
                });

                alert(`${newBlocks.length} block(s) added and moved to the center of your view.`);
            } else {
                alert("No new blocks were added. They might already exist or the suggestion was empty.");
            }

            console.log("Successfully injected AI suggested blocks.");
        } catch (e) {
            console.error("Failed to apply suggested blocks. XML Content:", xmlString);
            console.error(e);
            alert("Gagal menambahkan blok: " + e.message);
        }
    };

    const handleApplySuggestion = async (rawText) => {
        const widgetSpecs = parseAddWidgetSpecs(rawText);
        const createdWidgetIds = [];

        if (widgetSpecs.length > 0 && typeof onCreateWidgetFromAi === 'function') {
            for (const spec of widgetSpecs) {
                try {
                    const createdId = await Promise.resolve(onCreateWidgetFromAi(spec));
                    if (createdId) createdWidgetIds.push(createdId);
                } catch (e) {
                    console.warn('[AI Advisor] Failed to create widget from suggestion:', e);
                }
            }
        }

        const xmlSnippets = parseBlockXmlSnippets(rawText);
        if (xmlSnippets.length === 0) {
            if (createdWidgetIds.length > 0) {
                alert(`${createdWidgetIds.length} widget berhasil ditambahkan. Tidak ada block XML yang ditemukan.`);
            } else {
                alert('Tidak ada block XML atau widget directive yang bisa diterapkan.');
            }
            return;
        }

        for (const snippet of xmlSnippets) {
            await handleApplyXml(snippet, {
                autoCreateMissing: true,
                fallbackWidgetId: createdWidgetIds[0] || ''
            });
        }
    };

    return (
        <div className="blockly-editor-root" style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <style>{`
                .blockly-editor-root .blocklyZoom > image,
                .blockly-editor-root .blocklyTrash > image,
                .blockly-editor-root .blocklyFlyoutButton > image {
                    filter: brightness(0) saturate(100%) invert(20%) sepia(93%) saturate(2502%) hue-rotate(344deg) brightness(93%) contrast(100%) !important;
                    opacity: 1 !important;
                }

                .blockly-editor-root .blocklyZoom > g > circle,
                .blockly-editor-root .blocklyTrash > g > circle,
                .blockly-editor-root .blocklyZoom > circle {
                    fill: #fee2e2 !important;
                    stroke: #dc2626 !important;
                    stroke-width: 1.8 !important;
                }

                .blockly-editor-root .blocklyZoom > g > path,
                .blockly-editor-root .blocklyTrash > g > path,
                .blockly-editor-root .blocklyZoom > g > line,
                .blockly-editor-root .blocklyZoom > line {
                    stroke: #b91c1c !important;
                    fill: #b91c1c !important;
                    stroke-width: 2 !important;
                }

                .blockly-editor-root .blocklyZoom > g:hover > circle,
                .blockly-editor-root .blocklyTrash > g:hover > circle,
                .blockly-editor-root .blocklyZoom > g:focus > circle {
                    fill: #fecaca !important;
                    stroke: #ef4444 !important;
                }
            `}</style>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px', borderRadius: '10px' }}>
                            <Code size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{activeScope === 'GLOBAL' ? 'GLOBAL LOGIC' : `LOGIC: ${currentStep?.title || 'Unknown Screen'}`}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Construct logic for this specific scope</div>
                        </div>
                    </div>

                    {/* Scope Toggle */}
                    <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px', marginLeft: '20px' }}>
                        <button
                            onClick={() => setActiveScope('STEP')}
                            style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: activeScope === 'STEP' ? 'white' : 'transparent',
                                color: activeScope === 'STEP' ? '#1e293b' : '#64748b',
                                boxShadow: activeScope === 'STEP' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >Current Step</button>
                        <button
                            onClick={() => setActiveScope('GLOBAL')}
                            style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: activeScope === 'GLOBAL' ? 'white' : 'transparent',
                                color: activeScope === 'GLOBAL' ? '#1e293b' : '#64748b',
                                boxShadow: activeScope === 'GLOBAL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >Global Logic</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsAiAdvisorOpen(!isAiAdvisorOpen)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isAiAdvisorOpen ? '#4f46e5' : 'white',
                            color: isAiAdvisorOpen ? 'white' : '#4f46e5',
                            border: '1px solid #4f46e5',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Sparkles size={14} /> AI Advisor
                    </button>
                    <button
                        onClick={() => {
                            const code = javascriptGenerator.workspaceToCode(workspace.current);
                            setGeneratedCode(code);
                            setIsCodeViewOpen(true);
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Code size={14} /> View Code
                    </button>
                    <button
                        onClick={saveWorkspace}
                        disabled={isSavingLogic}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: saveStatus === 'error' ? '#dc2626' : (saveStatus === 'saved' ? '#16a34a' : '#3b82f6'),
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: isSavingLogic ? 'wait' : 'pointer',
                            opacity: isSavingLogic ? 0.95 : 1,
                            position: 'relative',
                            overflow: 'hidden',
                            minWidth: '170px'
                        }}
                    >
                        <span style={{ position: 'relative', zIndex: 2 }}>
                            {saveStatus === 'saving'
                                ? `Saving... ${saveProgress}%`
                                : saveStatus === 'saved'
                                    ? 'Saved'
                                    : saveStatus === 'error'
                                        ? 'Save Failed'
                                        : `Save ${activeScope === 'GLOBAL' ? 'Global' : 'Step'} Logic`}
                        </span>
                        {saveStatus === 'saving' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    bottom: 0,
                                    height: '3px',
                                    width: `${saveProgress}%`,
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    transition: 'width 0.12s linear',
                                    zIndex: 1
                                }}
                            />
                        )}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >Close</button>
                    )}
                </div>
            </div>

            {/* Workspace Div */}
            <div ref={blocklyDiv} style={{ flex: 1, height: '100%', width: '100%' }} />

            {/* AI Advisor Component */}
            <AiLogicAdvisor
                isOpen={isAiAdvisorOpen}
                onClose={() => setIsAiAdvisorOpen(false)}
                onApplyXml={handleApplyXml}
                onApplySuggestion={handleApplySuggestion}
                context={{
                    widgets: [...baseComponents, ...(currentStep?.components || [])].map(c => ({ id: c.id, type: c.type, name: c.name || c.props.label || c.props.text })),
                    variables: appVariables,
                    currentStepName: currentStep?.title
                }}
            />

            {/* Aesthetics Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                padding: '10px 15px',
                backgroundColor: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                pointerEvents: 'none',
                fontSize: '0.7rem',
                color: '#64748b',
                fontWeight: 600,
                zIndex: 5
            }}>
                APP INVENTOR BRIDGE ACTIVE
            </div>
            {/* Code View Modal */}
            {isCodeViewOpen && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    padding: '40px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Generated JavaScript Code</h2>
                            <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '0.75rem' }}>Scope: {activeScope}</p>
                        </div>
                        <button
                            onClick={() => setIsCodeViewOpen(false)}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'white',
                                padding: '8px',
                                borderRadius: '50%',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        backgroundColor: '#1e293b',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        <pre style={{
                            margin: 0,
                            color: '#f8fafc',
                            fontSize: '0.85rem',
                            fontFamily: "'Fira Code', 'Courier New', monospace",
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {generatedCode || '// No code generated yet. Add some blocks!'}
                        </pre>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(generatedCode);
                                alert("Code copied to clipboard!");
                            }}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >Copy Code</button>
                        <button
                            onClick={() => setIsCodeViewOpen(false)}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlocklyEditor;
