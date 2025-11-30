import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock para fetch
global.fetch = jest.fn();

// Mock para react-hot-toast
jest.mock('react-hot-toast', () => ({
  Toaster: () => null,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock para recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders Stock Logistic header', () => {
    render(<App />);
    expect(screen.getByText('Stock Logistic')).toBeInTheDocument();
    expect(screen.getByText('Sistema de Cotizaciones Inteligente')).toBeInTheDocument();
  });

  test('shows dashboard by default', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido al sistema de cotizaciones inteligente')).toBeInTheDocument();
  });

  test('navigates to quote form', () => {
    render(<App />);

    const newQuoteButton = screen.getByRole('button', { name: /nueva cotización/i });
    fireEvent.click(newQuoteButton);

    expect(screen.getByText('Nueva Cotización')).toBeInTheDocument();
    expect(screen.getByText('Complete los datos para generar una cotización inteligente')).toBeInTheDocument();
  });

  test('displays LUC1-COMEX status indicator', () => {
    render(<App />);
    expect(screen.getByText('LUC1-COMEX Online')).toBeInTheDocument();
  });

  test('shows navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva Cotización' })).toBeInTheDocument();
  });

  test('tab navigation works correctly', () => {
    render(<App />);

    // Start on dashboard
    expect(screen.getByText('Bienvenido al sistema de cotizaciones inteligente')).toBeInTheDocument();

    // Navigate to quote form
    const quoteTab = screen.getByRole('button', { name: 'Nueva Cotización' });
    fireEvent.click(quoteTab);
    expect(screen.getByText('Complete los datos para generar una cotización inteligente')).toBeInTheDocument();

    // Navigate back to dashboard
    const dashboardTab = screen.getByRole('button', { name: 'Dashboard' });
    fireEvent.click(dashboardTab);
    expect(screen.getByText('Bienvenido al sistema de cotizaciones inteligente')).toBeInTheDocument();
  });

  test('displays footer information', () => {
    render(<App />);
    expect(screen.getByText('© 2025 Stock Logistic. Todos los derechos reservados.')).toBeInTheDocument();
    expect(screen.getByText('Desarrollado con')).toBeInTheDocument();
  });
});