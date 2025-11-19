import { uIOhook, UiohookKey } from 'uiohook-napi';
import { EventEmitter } from 'events';

export type ModifierKey =
  | 'LeftAlt'
  | 'RightAlt'
  | 'LeftControl'
  | 'RightControl'
  | 'LeftShift'
  | 'RightShift'
  | 'LeftMeta'
  | 'RightMeta';

const MODIFIER_KEY_MAP: Record<ModifierKey, number> = {
  LeftAlt: UiohookKey.Alt,
  RightAlt: UiohookKey.AltRight,
  LeftControl: UiohookKey.Ctrl,
  RightControl: UiohookKey.CtrlRight,
  LeftShift: UiohookKey.Shift,
  RightShift: UiohookKey.ShiftRight,
  LeftMeta: UiohookKey.Meta,
  RightMeta: UiohookKey.MetaRight,
};

export class PushToTalkManager extends EventEmitter {
  private modifierKey: number;
  private isPressed = false;
  private isRunning = false;

  constructor(modifierKey: ModifierKey = 'RightAlt') {
    super();
    this.modifierKey = MODIFIER_KEY_MAP[modifierKey];
  }

  start(): void {
    if (this.isRunning) return;

    uIOhook.on('keydown', (e) => {
      if (e.keycode === this.modifierKey && !this.isPressed) {
        this.isPressed = true;
        this.emit('start');
      }
    });

    uIOhook.on('keyup', (e) => {
      if (e.keycode === this.modifierKey && this.isPressed) {
        this.isPressed = false;
        this.emit('stop');
      }
    });

    uIOhook.start();
    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning) return;

    uIOhook.stop();
    this.isRunning = false;
    this.isPressed = false;
  }

  setModifierKey(key: ModifierKey): void {
    this.modifierKey = MODIFIER_KEY_MAP[key];
  }

  getIsPressed(): boolean {
    return this.isPressed;
  }
}
