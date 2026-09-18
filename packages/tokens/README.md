# @pinkless/tokens

## Design tokens

tokens.css:
```css
:root,
[data-theme="light"] {
  --surface-100: #f3ede1;
  --surface-pink: #f28fc0;
  --surface-900: #7a1a46;
  --ink: var(--surface-900);
  --on-dark: var(--surface-100);
  --on-dark-muted: #f2a9cc;
  --border: #c2607e;

  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

.display { font-family: var(--font-sans); font-size: 32px; line-height: 40px; font-weight: 700; }
.heading { font-family: var(--font-sans); font-size: 20px; line-height: 28px; font-weight: 600; }
.body    { font-family: var(--font-sans); font-size: 15px; line-height: 22px; font-weight: 400; }
.caption { font-family: var(--font-sans); font-size: 13px; line-height: 18px; font-weight: 400; }
.label   { font-family: var(--font-sans); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.02em; }
```

tokens.json:
```json
{
  "name": "Pinkless",
  "version": 1,
  "color": {
    "themes": [{"id": "light", "name": "Light"}],
    "tokens": [
      {"name": "surface-100", "value": "#f3ede1", "usage": "The cream ground under every panel: page background and stat cards."},
      {"name": "surface-pink", "value": "#f28fc0", "usage": "Hero and 'problem' panel background."},
      {"name": "surface-900", "value": "#7a1a46", "usage": "Dark 'insight'/payoff panel background."},
      {"name": "ink", "value": "{surface-900}", "usage": "Headlines, stat numbers, body copy on surface-100/surface-pink."},
      {"name": "on-dark", "value": "{surface-100}", "usage": "Headlines/body copy on surface-900."},
      {"name": "on-dark-muted", "value": "#f2a9cc", "usage": "Section labels and secondary text on surface-900."},
      {"name": "border", "value": "#c2607e", "usage": "Card edges and dividers. Not from source — added for functional need."}
    ]
  },
  "type": {
    "families": { "sans": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, sans-serif" },
    "groups": [{
      "name": "Text",
      "family": "sans",
      "styles": [
        {"name": "display", "fontSize": "32px", "lineHeight": "40px", "fontWeight": 700},
        {"name": "heading", "fontSize": "20px", "lineHeight": "28px", "fontWeight": 600},
        {"name": "body", "fontSize": "15px", "lineHeight": "22px", "fontWeight": 400},
        {"name": "caption", "fontSize": "13px", "lineHeight": "18px", "fontWeight": 400},
        {"name": "label", "fontSize": "12px", "lineHeight": "16px", "fontWeight": 600, "letterSpacing": "0.02em"}
      ]
    }]
  },
  "spacing": { "tokens": [
    {"name": "space-2", "value": "8px"}, {"name": "space-3", "value": "12px"},
    {"name": "space-4", "value": "16px"}, {"name": "space-6", "value": "24px"}
  ]},
  "radius": { "tokens": [
    {"name": "radius-sm", "value": "6px"}, {"name": "radius-md", "value": "10px"}, {"name": "radius-lg", "value": "16px"}
  ]}
}
```
