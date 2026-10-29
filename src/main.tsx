import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@lichess-org/chessground/assets/chessground.base.css';
import './styles.css';
import { App } from './App';
import { boardsCss } from './ui/boards';
import { initDrive } from './store/drive';

const style = document.createElement('style');
style.textContent = boardsCss();
document.head.append(style);

initDrive();

createRoot(document.getElementById('root')!).render(<App />);
