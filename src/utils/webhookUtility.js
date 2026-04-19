/**
 * Webhook Utility
 * Handles data synchronization with external ERP/MES systems.
 */
class WebhookUtility {
    constructor() {
        this.endpoint = (localStorage.getItem('mavi_webhook_endpoint') || 'https://webhook.site/placeholder');
    }

    /**
     * Set the webhook endpoint
     * @param {string} url 
     */
    setEndpoint(url) {
        this.endpoint = url;
        localStorage.setItem('mavi_webhook_endpoint', url);
    }

    /**
     * Notify an external system when a production cycle is completed.
     * @param {Object} cycleData - The detailed data for the completed cycle.
     */
    async syncProductionRecord(cycleData) {
        if (!this.endpoint) {
            console.warn('Webhook Notification: No endpoint configured.');
            return;
        }

        console.log(`Syncing production record to ${this.endpoint}...`);

        const payload = {
            mavi_id: cycleData.mavi_id || 'N/A',
            timestamp: new Date().toISOString(),
            sop_id: cycleData.sop_id,
            manual_title: cycleData.manual_title,
            operator_id: cycleData.operator_id,
            total_duration_sec: cycleData.total_time,
            has_signature: !!cycleData.operator_id,
            steps: cycleData.steps || []
        };

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`External system responded with status ${response.status}`);
            }

            console.log('Production record successfully synced to external system.');
            return true;
        } catch (error) {
            console.error('Failed to sync production record via Webhook:', error);
            return false;
        }
    }
}

const webhookUtility = new WebhookUtility();
export default webhookUtility;
