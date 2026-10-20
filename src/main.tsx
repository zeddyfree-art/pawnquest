import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@lichess-org/chessground/assets/chessground.base.css';
import './styles.css';
import { App } from './App';
import { boardCss } from './ui/pixelArt';

const style = document.createElement('style');
style.textContent = boardCss();
document.head.append(style);

createRoot(document.getElementById('root')!).render(<App />);
