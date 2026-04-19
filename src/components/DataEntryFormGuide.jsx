import React from 'react';

const STEPS = [
    {
        title: '1) Create a new app',
        items: [
            'In the Apps tab, click Apps.',
            'Click + Create App in the top right corner.',
            'Name the app: “Data Entry Form - Example”.',
            'Optional: add description, e.g. “This is an example app”.',
            'Click + Create.',
            'From app details, click Edit (or Untitled Step) to enter App Editor.',
        ],
    },
    {
        title: '2) Add input widgets with variable data sources',
        items: [
            'Inputs tab → select Checkbox.',
            'Set Label: “Work order completed”.',
            'Datasource → + Add variable.',
            'Variable name: “Work order completed”; Default value: no; click + Create.',
            'Add Date picker from Inputs tab.',
            'Set Label: “Date completed”.',
            'Datasource → + Add variable → name “Date completed” → + Create.',
        ],
    },
    {
        title: '3) Create trigger to save input data',
        items: [
            'Buttons tab → select Submit.',
            'In side pane, click + next to Triggers.',
            'Trigger title: “Save app data”.',
            'Then section: App → Save All App Data.',
            'Click Save.',
        ],
    },
    {
        title: '4) Test in Developer Mode',
        items: [
            'Run Test mode for the step.',
            'Verify variable values are stored into completion data.',
            'Continue to Exercise 2: Store if needed.',
        ],
    },
];

const DataEntryFormGuide = () => {
    return (
        <div
            style={{
                height: '100%',
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
                padding: '28px',
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <div
                style={{
                    maxWidth: '960px',
                    margin: '0 auto',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '24px',
                    boxShadow: '0 10px 25px rgba(2, 6, 23, 0.05)',
                }}
            >
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: 900 }}>
                    Data Entry Form - Example
                </h1>
                <p style={{ marginTop: '10px', color: '#475569', lineHeight: 1.6 }}>
                    Panduan ini ditambahkan ke menu <b>APPS</b> sesuai request, mengacu ke dokumentasi Tulip walkthrough.
                </p>

                <a
                    href="https://support.tulip.co/r230/docs/walkthrough-build-a-data-entry-form"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        marginBottom: '18px',
                        color: '#2563eb',
                        fontWeight: 700,
                        textDecoration: 'none',
                    }}
                >
                    Open official guide ↗
                </a>

                <div style={{ display: 'grid', gap: '14px' }}>
                    {STEPS.map((section) => (
                        <div
                            key={section.title}
                            style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                backgroundColor: '#f8fafc',
                            }}
                        >
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#0f172a' }}>{section.title}</h3>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.55 }}>
                                {section.items.map((it) => (
                                    <li key={it}>{it}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DataEntryFormGuide;
