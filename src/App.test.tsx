import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import App from './App';
it('renders the existing section order and primary controls', () => {
  const { container } = render(<App />);
  expect([...container.querySelectorAll('.panel h2')].map((x) => x.textContent)).toEqual([
    'Add Player',
    'Player Roster',
    'Session QR',
    'Session Config',
    'Live Courts',
    'Next Up',
    'Leaderboard',
    'Match History',
  ]);
  expect(screen.getByRole('button', { name: 'Add to Roster' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Generate Next Round' })).toBeEnabled();
});
