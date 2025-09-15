import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders Notes brand and allows creating a note', () => {
  render(<App />);
  expect(screen.getByText(/Notes/i)).toBeInTheDocument();

  const createButtons = screen.getAllByText(/\+ New/i);
  fireEvent.click(createButtons[0]); // click first + New button (toolbar/empty)

  // After creating, there should be an editor with title input
  expect(screen.getByPlaceholderText(/Note title/i)).toBeInTheDocument();
});
