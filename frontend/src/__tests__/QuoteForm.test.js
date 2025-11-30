import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuoteForm from '../components/QuoteForm/QuoteForm';

// Mock para react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock para fetch
global.fetch = jest.fn();

describe('QuoteForm Component', () => {
  const mockOnQuoteGenerated = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    mockOnQuoteGenerated.mockClear();
  });

  test('renders form fields correctly', () => {
    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    expect(screen.getByText(/ciudad de origen/i)).toBeInTheDocument();
    expect(screen.getByText(/ciudad de destino/i)).toBeInTheDocument();
    expect(screen.getByText(/tipo de carga/i)).toBeInTheDocument();
    expect(screen.getByText(/peso \(kg\)/i)).toBeInTheDocument();
    expect(screen.getByText(/volumen \(m³\)/i)).toBeInTheDocument();
    expect(screen.getByText(/valor de la carga \(€\)/i)).toBeInTheDocument();
    expect(screen.getByText(/fecha de entrega deseada/i)).toBeInTheDocument();
  });

  test('displays cargo type options', () => {
    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    expect(screen.getByText(/tipo de carga/i)).toBeInTheDocument();
    expect(screen.getByText('Seleccionar...')).toBeInTheDocument();
  });

  test('displays service type options', () => {
    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    expect(screen.getByText('Económico')).toBeInTheDocument();
    expect(screen.getByText('Estándar')).toBeInTheDocument();
    expect(screen.getByText('Express')).toBeInTheDocument();
  });

  test('displays additional requirements checkboxes', () => {
    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    expect(screen.getByText(/seguro de carga/i)).toBeInTheDocument();
    expect(screen.getByText(/seguimiento en tiempo real/i)).toBeInTheDocument();
    expect(screen.getByText(/firma de entrega requerida/i)).toBeInTheDocument();
  });

  test('shows validation errors for empty required fields', async () => {
    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    const submitButton = screen.getByRole('button', { name: /generar cotización inteligente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/el origen es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/el destino es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/seleccione el tipo de carga/i)).toBeInTheDocument();
    });
  });

  test('successful form submission', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        quoteId: 'Q123456',
        options: [
          {
            service: 'standard',
            totalCost: 2450,
            estimatedTime: 48,
            deliveryDate: '2025-09-25',
            vehicleType: 'Camión 24t',
            breakdown: {
              base: 2000,
              fuel: 300,
              tolls: 150,
              insurance: 0
            },
            features: ['Seguimiento GPS', 'Seguro básico'],
            recommended: true
          }
        ],
        route: {
          origin: 'Madrid, España',
          destination: 'Berlín, Alemania',
          distance: 1850
        },
        alerts: []
      })
    };

    fetch.mockResolvedValueOnce(mockResponse);

    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/ciudad de origen/i), {
      target: { value: 'Madrid, España' }
    });
    fireEvent.change(screen.getByLabelText(/ciudad de destino/i), {
      target: { value: 'Berlín, Alemania' }
    });

    const cargoSelect = screen.getByLabelText(/tipo de carga/i);
    fireEvent.change(cargoSelect, { target: { value: 'general' } });

    fireEvent.change(screen.getByLabelText(/peso \(kg\)/i), {
      target: { value: '1000' }
    });
    fireEvent.change(screen.getByLabelText(/volumen \(m³\)/i), {
      target: { value: '5.0' }
    });
    fireEvent.change(screen.getByLabelText(/valor de la carga \(€\)/i), {
      target: { value: '10000' }
    });

    // Set delivery date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    fireEvent.change(screen.getByLabelText(/fecha de entrega deseada/i), {
      target: { value: tomorrowString }
    });

    // Select service type
    const standardService = screen.getByDisplayValue('standard');
    fireEvent.click(standardService);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /generar cotización inteligente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/quotes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: 'Madrid, España',
          destination: 'Berlín, Alemania',
          cargo: {
            type: 'general',
            weight: 1000,
            volume: 5.0,
            value: 10000,
            description: ''
          },
          service: 'standard',
          deliveryDate: tomorrowString,
          requirements: {
            insurance: false,
            tracking: false,
            signature: false
          }
        })
      });
      expect(mockOnQuoteGenerated).toHaveBeenCalled();
    });
  });

  test('handles API errors correctly', async () => {
    const mockResponse = {
      ok: false,
      status: 500
    };

    fetch.mockResolvedValueOnce(mockResponse);

    render(<QuoteForm onQuoteGenerated={mockOnQuoteGenerated} />);

    // Fill required fields quickly
    fireEvent.change(screen.getByLabelText(/ciudad de origen/i), {
      target: { value: 'Madrid' }
    });
    fireEvent.change(screen.getByLabelText(/ciudad de destino/i), {
      target: { value: 'Berlín' }
    });

    const cargoSelect = screen.getByLabelText(/tipo de carga/i);
    fireEvent.change(cargoSelect, { target: { value: 'general' } });

    fireEvent.change(screen.getByLabelText(/peso \(kg\)/i), {
      target: { value: '1000' }
    });
    fireEvent.change(screen.getByLabelText(/volumen \(m³\)/i), {
      target: { value: '5.0' }
    });
    fireEvent.change(screen.getByLabelText(/valor de la carga \(€\)/i), {
      target: { value: '10000' }
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    fireEvent.change(screen.getByLabelText(/fecha de entrega deseada/i), {
      target: { value: tomorrow.toISOString().split('T')[0] }
    });

    // Select service type
    const standardService = screen.getByDisplayValue('standard');
    fireEvent.click(standardService);

    const submitButton = screen.getByRole('button', { name: /generar cotización inteligente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnQuoteGenerated).not.toHaveBeenCalled();
    });
  });
});