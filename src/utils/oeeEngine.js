import { getMachineActivityLogs } from './database';

/**
 * OEE Engine Utility
 * Calculates industrial KPIs: Availability, Performance, Quality, and OEE.
 */
export const calculateOEE = async (machineId, options = {}) => {
    const {
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Default: Last 24h
        endTime = new Date().toISOString(),
        idealCycleTime = 60, // seconds per part
        goodParts = 100,
        totalParts = 105
    } = options;

    const logs = await getMachineActivityLogs(machineId);
    if (!logs || logs.length === 0) {
        return { availability: 0, performance: 0, quality: 0, oee: 0 };
    }

    // Filter logs by time range
    const filteredLogs = logs.filter(l => l.timestamp >= startTime && l.timestamp <= endTime);
    if (filteredLogs.length === 0) return { availability: 0, performance: 0, quality: 0, oee: 0 };

    // 1. Calculate Availability
    // Simplified logic: calculate duration between status changes
    let runningTime = 0;
    let downTime = 0;
    
    // Sort logs by timestamp
    const sortedLogs = [...filteredLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (let i = 0; i < sortedLogs.length - 1; i++) {
        const current = sortedLogs[i];
        const next = sortedLogs[i+1];
        const duration = (new Date(next.timestamp) - new Date(current.timestamp)) / 1000; // seconds
        
        if (current.status === 'RUNNING') {
            runningTime += duration;
        } else if (current.status === 'DOWN') {
            downTime += duration;
        }
    }

    // Total planned time = running + down + idle etc.
    const totalTime = runningTime + downTime;
    const availability = totalTime > 0 ? (runningTime / totalTime) : 0;

    // 2. Calculate Performance
    // (Total Parts * Ideal Cycle Time) / Operating Time
    const performance = runningTime > 0 ? (totalParts * idealCycleTime) / runningTime : 0;

    // 3. Calculate Quality
    const quality = totalParts > 0 ? (goodParts / totalParts) : 0;

    // 4. OEE
    const oee = availability * performance * quality;

    return {
        availability: Math.min(1, availability) * 100,
        performance: Math.min(1, performance) * 100,
        quality: Math.min(1, quality) * 100,
        oee: Math.min(1, oee) * 100,
        runningTimeSeconds: runningTime,
        downTimeSeconds: downTime
    };
};

export default { calculateOEE };
