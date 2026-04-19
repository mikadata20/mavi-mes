/**
 * shopfloorTemplate.js
 * Generates a complete 5-step shopfloor application JSON structure for MAVI-MES
 */

export function createShopfloorTemplate() {
    const timestamp = Date.now();
    const currentIso = new Date().toISOString();

    return {
        id: `app_template_sf_${timestamp}`,
        name: "Shopfloor Standard Work",
        description: "Complete 5-step template for Work Instructions, Assembly, and Quality Checks",
        category: "Shop Floor",
        type: "FRONT-LINE",
        published: true, // Auto publish so operators can see it immediately
        approvalStatus: "APPROVED",
        createdAt: currentIso,
        updatedAt: currentIso,
        
        config: {
            appVariables: [
                { id: `var_wo_${timestamp}`, name: "Work_Order", type: "string", defaultValue: "SCAN-TO-START", persisted: true },
                { id: `var_torque_${timestamp}`, name: "Torque_Value", type: "number", defaultValue: 0, persisted: false },
                { id: `var_qc_status_${timestamp}`, name: "QC_Result", type: "string", defaultValue: "PENDING", persisted: false }
            ],
            appFunctions: [
                {
                    id: `func_oee_${timestamp}`,
                    name: "Calculate_Efficiency",
                    description: "Samples OEE calculation based on cycle time",
                    inputs: [
                        { name: "actual_seconds", type: "NUMBER" },
                        { name: "target_seconds", type: "NUMBER" }
                    ],
                    steps: [
                        { type: "SET", variableName: "Efficiency", expression: "($actual_seconds / $target_seconds) * 100" },
                        { type: "RETURN", expression: "$Efficiency" }
                    ]
                }
            ],
            recordPlaceholders: [
                {
                    id: `rp_wo_${timestamp}`,
                    name: "Current_Work_Order",
                    tableId: "orders_table_placeholder",
                    description: "Main record handle for the work order"
                }
            ],
            appTables: [],
            appTriggers: [
                {
                    id: `trig_start_${timestamp}`,
                    on: "APP_START",
                    actions: [
                        { type: "SHOW_MESSAGE", detail: { message: "Welcome to Shopfloor Module. Please scan your Work Order to begin.", status: "INFO" } }
                    ]
                }
            ],
            baseComponents: [
                {
                    id: `bc_header_${timestamp}`,
                    type: "SHAPE",
                    x: 0, y: 0, w: 1024, h: 60,
                    props: { type: "rectangle", backgroundColor: "#0f172a", borderRadius: 0, strokeWidth: 0, triggers: [] }
                },
                {
                    id: `bc_title_${timestamp}`,
                    type: "TEXT",
                    x: 20, y: 15, w: 400, h: 30,
                    props: { text: "Standard Operating Procedure: Assembly", fontSize: 24, fontWeight: "bold", color: "#ffffff", triggers: [] }
                },
                {
                    id: `bc_var_${timestamp}`,
                    type: "VARIABLE_TEXT",
                    x: 750, y: 15, w: 250, h: 30,
                    props: { 
                        varSource: "APP_INFO.WORK_ORDER", 
                        fontSize: 20, 
                        fontWeight: "bold", 
                        color: "#3b82f6", 
                        textAlign: "right",
                        triggers: [],
                        dataBinding: { enabled: false }
                    }
                }
            ],
            steps: [
                // STEP 1: SCAN WO
                {
                    id: `step_scan_${timestamp}`,
                    title: "1. Scan Target",
                    stepType: "Step",
                    cycleTimeSeconds: 30,
                    parentGroupId: null,
                    formSubmit: { buttonLabel: "Submit", requireAll: false, resetOnSubmit: false, enableSubmit: false },
                    triggers: [],
                    components: [
                        {
                            id: `c1_title_${timestamp}`,
                            type: "TEXT",
                            x: 350, y: 150, w: 400, h: 40,
                            props: { text: "Please Scan Work Order", fontSize: 28, fontWeight: "bold", textAlign: "center", triggers: [] }
                        },
                        {
                            id: `c1_scan_${timestamp}`,
                            type: "BARCODE",
                            x: 312, y: 220, w: 400, h: 60,
                            props: { 
                                placeholder: "Scan Barcode...", 
                                autoFocus: true, 
                                triggers: [
                                    {
                                        id: `trig_scan_${timestamp}`,
                                        on: "BARCODE_SCANNED",
                                        actions: [
                                            { type: "DATA_MANIPULATION", detail: { target: "APP_INFO.WORK_ORDER", operation: "SET", value: "{{EVENT.PAYLOAD}}" } },
                                            { type: "NAVIGATION", detail: { target: `step_setup_${timestamp}` } }
                                        ]
                                    }
                                ] 
                            }
                        },
                        {
                            id: `c1_img_${timestamp}`,
                            type: "IMAGE",
                            x: 412, y: 320, w: 200, h: 200,
                            props: { src: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WO-2026-991", alt: "Sample QR", triggers: [] }
                        }
                    ]
                },

                // STEP 2: SETUP INSTRUCTIONS
                {
                    id: `step_setup_${timestamp}`,
                    title: "2. Setup & Safety",
                    stepType: "Step",
                    cycleTimeSeconds: 60,
                    parentGroupId: null,
                    formSubmit: { buttonLabel: "Submit", requireAll: false },
                    triggers: [],
                    components: [
                        {
                            id: `c2_pdf_${timestamp}`,
                            type: "PDF",
                            x: 40, y: 80, w: 600, h: 600,
                            props: { title: "Safety Protocol 101", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", triggers: [] }
                        },
                        {
                            id: `c2_check_${timestamp}`,
                            type: "CHECKLIST",
                            x: 680, y: 100, w: 300, h: 300,
                            props: { items: ["Wear Safety Goggles", "Calibrate Torque Wrench", "Clear Debris"], title: "Pre-Flight Checks", showProgress: true, triggers: [] }
                        },
                        {
                            id: `c2_btn_${timestamp}`,
                            type: "BUTTON",
                            x: 680, y: 440, w: 300, h: 60,
                            props: { 
                                label: "Acknowledge & Start", 
                                backgroundColor: "#22c55e", 
                                color: "#ffffff", 
                                fontSize: 18,
                                action: "NEXT_STEP", 
                                targetStepId: `step_assembly_${timestamp}`,
                                triggers: [] 
                            }
                        }
                    ]
                },

                // STEP 3: ASSEMBLY
                {
                    id: `step_assembly_${timestamp}`,
                    title: "3. Perform Assembly",
                    stepType: "Form Step",
                    cycleTimeSeconds: 120,
                    parentGroupId: null,
                    formSubmit: { buttonLabel: "Finish Assembly", requireAll: false },
                    triggers: [],
                    components: [
                        {
                            id: `c3_img_${timestamp}`,
                            type: "IMAGE",
                            x: 40, y: 80, w: 500, h: 400,
                            props: { src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800", alt: "Assembly Process", triggers: [] }
                        },
                        {
                            id: `c3_timer_${timestamp}`,
                            type: "TIMER",
                            x: 600, y: 80, w: 380, h: 100,
                            props: { label: "Target Cycle Time", format: "mm:ss", cycleTargetSeconds: 120, showProcessCycle: true, fontSize: 36, textAlign: "center", color: "#2563eb", triggers: [] }
                        },
                        {
                            id: `c3_btn_${timestamp}`,
                            type: "BUTTON",
                            x: 600, y: 220, w: 380, h: 80,
                            props: { 
                                label: "PROCEED TO QUALITY CHECK", 
                                action: "NEXT_STEP", 
                                targetStepId: `step_quality_${timestamp}`,
                                backgroundColor: "#3b82f6", 
                                color: "white", 
                                fontSize: 18, 
                                triggers: [] 
                            }
                        }
                    ]
                },

                // STEP 4: QUALITY CHECK
                {
                    id: `step_quality_${timestamp}`,
                    title: "4. Quality Inspection",
                    stepType: "Form Step",
                    cycleTimeSeconds: 60,
                    parentGroupId: null,
                    formSubmit: { buttonLabel: "Submit Form", requireAll: false },
                    triggers: [],
                    components: [
                        {
                            id: `c4_title_${timestamp}`,
                            type: "TEXT",
                            x: 50, y: 80, w: 500, h: 50,
                            props: { text: "Quality Data Entry", fontSize: 32, fontWeight: "bold", color: "#0f172a", triggers: [] }
                        },
                        {
                            id: `c4_tol_${timestamp}`,
                            type: "QUALITY_TOLERANCE",
                            x: 50, y: 160, w: 400, h: 150,
                            props: { label: "Pin Diameter Check", min: 14.95, max: 15.05, unit: "mm", triggers: [] }
                        },
                        {
                            id: `c4_rad_${timestamp}`,
                            type: "RADIO_GROUP",
                            x: 50, y: 340, w: 400, h: 120,
                            props: { label: "Visual Inspection", options: ["PASS - No Scratches", "FAIL - Scratches visible"], defaultValue: "", required: true, triggers: [] }
                        },
                        {
                            id: `c4_btn_${timestamp}`,
                            type: "BUTTON",
                            x: 500, y: 160, w: 300, h: 80,
                            props: { 
                                label: "Finalize Checks", 
                                action: "NEXT_STEP",
                                targetStepId: `step_sign_${timestamp}`,
                                backgroundColor: "#f59e0b", 
                                color: "white", 
                                fontSize: 18, 
                                triggers: [] 
                            }
                        }
                    ]
                },

                // STEP 5: SIGN-OFF
                {
                    id: `step_sign_${timestamp}`,
                    title: "5. Sign-off",
                    stepType: "Signature Form",
                    cycleTimeSeconds: 45,
                    parentGroupId: null,
                    formSubmit: { buttonLabel: "Complete", requireAll: true },
                    triggers: [],
                    components: [
                        {
                            id: `c5_title_${timestamp}`,
                            type: "TEXT",
                            x: 300, y: 150, w: 424, h: 40,
                            props: { text: "Supervisor Sign-off Required", fontSize: 24, fontWeight: "bold", textAlign: "center", triggers: [] }
                        },
                        {
                            id: `c5_sign_${timestamp}`,
                            type: "SIGNATURE",
                            x: 300, y: 220, w: 424, h: 200,
                            props: { label: "Draw your signature above", signatureMode: "DRAW", required: true, triggers: [] }
                        },
                        {
                            id: `c5_done_${timestamp}`,
                            type: "COMPLETE_BUTTON",
                            x: 300, y: 460, w: 424, h: 80,
                            props: { label: "COMPLETE WORK ORDER", action: "COMPLETE", backgroundColor: "#10b981", color: "#ffffff", fontSize: 20, fontWeight: "bold", textAlign: "center", triggers: [] }
                        }
                    ]
                }
            ]
        }
    };
}
