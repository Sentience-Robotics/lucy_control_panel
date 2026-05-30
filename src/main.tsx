import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { mountUiThemeCssVars, UI_BG_BLACK } from './Constants/uiTheme.ts'

mountUiThemeCssVars()
document.body.style.backgroundColor = UI_BG_BLACK

const rootElement = document.getElementById('root');

const root = createRoot(rootElement as HTMLElement);
root.render(
    <StrictMode>
        <App />
    </StrictMode>
);
