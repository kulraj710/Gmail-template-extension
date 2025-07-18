# Gmail Templates (Chrome Extension)

A minimalist Chrome extension that lets you **search, fill, and insert reusable email templates directly into any Gmail compose window**.  
Templates live in a single Google Doc, so updating them is as easy as editing that file.

---

## ✨ Features
| Feature | Details |
|---------|---------|
| **Single-source templates** | Reads plain-text blocks from a Google Doc (ID: `11NRyqFhn0J6cKpYZmp2VyaCNcWUi7LwQqAATMlDoiXk`). |
| **Instant search & filter** | Live search box plus category “chips” & starred view. |
| **Placeholders** | Supports `{{ token }}` placeholders; prompts you to fill them before insertion. |
| **One-click insert** | Inserts formatted HTML into the active Gmail compose area, places cursor at the end. |
| **Keyboard friendly** | Arrow keys for navigation, `1-9` to open top templates, **Esc** to clear/back, fully tabbable. |
| **Stars saved locally** | Your starred templates are synced in `chrome.storage` under `starredTemplates_v1`. |

---

## 🚀 Install & Setup
1. **Clone / Download** the repo.
2. Go to `chrome://extensions` → **Developer mode** → **Load unpacked** → select the extension folder.
3. Open the bundled _Google Doc_ → duplicate it → add / edit templates in the form:

```
== Template: Follow-up Email ==
[[ Category: Sales ]]
[[ Author: Jane Doe ]]

Hi {{ First Name }},

Thanks for your time today…
```

4. Replace `DOC_ID` in `popup.js` with your doc’s ID (share as “Anyone with link → Viewer”).

---

## 🖱️ Using in Gmail
1. Click the **paper plane icon** in the Chrome toolbar while a Gmail compose window is open.
2. **Search / filter** or arrow-key through templates.
3. Press **Enter** to select, fill in placeholder prompts (if any), and it’s inserted—done!

---

## ⌨️ Keyboard Shortcuts
- **Arrow Left/Right** – move between category chips  
- **Arrow Up/Down** – navigate template list  
- **1-9** – open the corresponding template  
- **Esc** – clear search (list view) or return to list (form view)

---

## 🛠️ Develop
```
npm i          # only if you add tooling, not required for vanilla JS
npm run build  # optional build step if you modularize
```
---

## 📄 License
MIT – do what you like, no warranties.
