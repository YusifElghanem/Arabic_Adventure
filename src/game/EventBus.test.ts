import { describe, expect, it, vi } from 'vitest';
import { TypedEventBus } from './EventBus';

type Events = { ping: [n: number]; pair: [a: string, b: boolean] };

describe('TypedEventBus', () => {
  it('delivers arguments to every listener', () => {
    const bus = new TypedEventBus<Events>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('pair', a);
    bus.on('pair', b);
    bus.emit('pair', 'x', true);
    expect(a).toHaveBeenCalledWith('x', true);
    expect(b).toHaveBeenCalledWith('x', true);
  });

  it('unsubscribes via the returned function and via off()', () => {
    const bus = new TypedEventBus<Events>();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on('ping', a);
    bus.on('ping', b);
    offA();
    bus.off('ping', b);
    bus.emit('ping', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('once() fires a single time', () => {
    const bus = new TypedEventBus<Events>();
    const a = vi.fn();
    bus.once('ping', a);
    bus.emit('ping', 1);
    bus.emit('ping', 2);
    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(1);
  });

  it('keeps notifying other listeners when one throws', () => {
    const bus = new TypedEventBus<Events>();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = vi.fn();
    bus.on('ping', () => {
      throw new Error('boom');
    });
    bus.on('ping', good);
    bus.emit('ping', 3);
    expect(good).toHaveBeenCalledWith(3);
  });

  it('lets a listener unsubscribe itself during emit', () => {
    const bus = new TypedEventBus<Events>();
    const later = vi.fn();
    const off = bus.on('ping', () => off());
    bus.on('ping', later);
    bus.emit('ping', 1);
    bus.emit('ping', 2);
    expect(later).toHaveBeenCalledTimes(2);
  });
});
