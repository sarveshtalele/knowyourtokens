import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('is a labelled dialog that closes on Escape and moves focus to Close', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Request" onClose={onClose}>
        body
      </Drawer>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Request' });
    expect(dialog).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <Drawer open={false} title="x" onClose={() => {}}>
        body
      </Drawer>,
    );
    expect(container.innerHTML).toBe('');
  });
});
