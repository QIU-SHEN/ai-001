// ============================================
// Minimal Endless Runner - Entry Point
// ============================================
import { Game } from './core/Game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.loop(0);
