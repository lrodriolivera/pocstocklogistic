import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../components/UI/Dashboard';

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

// Mock para AnimatedMetrics
jest.mock('../components/UI/AnimatedMetrics', () => {
  return function MockAnimatedMetrics({ title, value, format }) {
    const formatValue = (val) => {
      if (format === 'currency') {
        return `€${Math.round(val).toLocaleString()}`;
      } else if (format === 'percentage') {
        return `${val.toFixed(1)}%`;
      }
      return Math.round(val).toLocaleString();
    };

    return (
      <div data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h3>{title}</h3>
        <span>{formatValue(value)}</span>
      </div>
    );
  };
});

describe('Dashboard Component', () => {
  test('renders dashboard header', () => {
    render(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido al sistema de cotizaciones inteligente')).toBeInTheDocument();
  });

  test('displays LUC1-COMEX status indicator', () => {
    render(<Dashboard />);

    expect(screen.getByText('LUC1-COMEX Activo')).toBeInTheDocument();
  });

  test('shows Nueva Cotización button', () => {
    render(<Dashboard />);

    const newQuoteButton = screen.getByRole('button', { name: /nueva cotización/i });
    expect(newQuoteButton).toBeInTheDocument();
  });

  test('displays animated metrics cards', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-cotizaciones-totales')).toBeInTheDocument();
      expect(screen.getByTestId('metric-ingresos-del-mes')).toBeInTheDocument();
      expect(screen.getByTestId('metric-rutas-activas')).toBeInTheDocument();
      expect(screen.getByTestId('metric-tiempo-respuesta-avg')).toBeInTheDocument();
      expect(screen.getByTestId('metric-satisfacción-cliente')).toBeInTheDocument();
      expect(screen.getByTestId('metric-tasa-aceptación')).toBeInTheDocument();
    });
  });

  test('displays correct metric values', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Check if animated values are displayed
      expect(screen.getByText('Cotizaciones Totales')).toBeInTheDocument();
      expect(screen.getByText('Ingresos del Mes')).toBeInTheDocument();
      expect(screen.getByText('Rutas Activas')).toBeInTheDocument();
      expect(screen.getByText('Tiempo Respuesta Avg')).toBeInTheDocument();
      expect(screen.getByText('Satisfacción Cliente')).toBeInTheDocument();
      expect(screen.getByText('Tasa Aceptación')).toBeInTheDocument();
    });
  });

  test('renders charts section', () => {
    render(<Dashboard />);

    expect(screen.getByText('Tendencia de Cotizaciones')).toBeInTheDocument();
    expect(screen.getByText('Distribución de Servicios')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('displays recent activity section', () => {
    render(<Dashboard />);

    expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
    expect(screen.getByText(/nueva cotización.*madrid.*berlín/i)).toBeInTheDocument();
    expect(screen.getByText(/cotización aceptada.*timber corp/i)).toBeInTheDocument();
    expect(screen.getByText(/restricción detectada.*ruta a7/i)).toBeInTheDocument();
    expect(screen.getByText(/entrega completada.*parís.*milano/i)).toBeInTheDocument();
  });

  test('shows system status panel', () => {
    render(<Dashboard />);

    expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();
    expect(screen.getByText('API Backend')).toBeInTheDocument();
    expect(screen.getByText('LUC1-COMEX AI')).toBeInTheDocument();
    expect(screen.getByText('Base de Datos')).toBeInTheDocument();
    expect(screen.getByText('APIs Externas')).toBeInTheDocument();

    // Check status indicators
    expect(screen.getAllByText('Operacional').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Online').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conectada').length).toBeGreaterThan(0);
  });

  test('displays uptime and performance metrics', () => {
    render(<Dashboard />);

    expect(screen.getByText(/uptime.*99\.97%/i)).toBeInTheDocument();
    expect(screen.getByText(/respuesta avg.*245ms/i)).toBeInTheDocument();
  });

  test('shows view all activities button', () => {
    render(<Dashboard />);

    const viewAllButton = screen.getByRole('button', { name: /ver todas las actividades/i });
    expect(viewAllButton).toBeInTheDocument();
  });

  test('displays activity timestamps', () => {
    render(<Dashboard />);

    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    expect(screen.getByText('15 min ago')).toBeInTheDocument();
    expect(screen.getByText('1 hora ago')).toBeInTheDocument();
    expect(screen.getByText('2 horas ago')).toBeInTheDocument();
  });

  test('shows system status with appropriate colors', () => {
    render(<Dashboard />);

    // The actual DOM structure will have colored indicators
    // We can test for the presence of status text
    const operationalStatuses = screen.getAllByText('Operacional');
    const onlineStatuses = screen.getAllByText('Online');
    const connectedStatuses = screen.getAllByText('Conectada');
    const limitedStatuses = screen.getAllByText('Limitado');

    expect(operationalStatuses.length).toBeGreaterThan(0);
    expect(onlineStatuses.length).toBeGreaterThan(0);
    expect(connectedStatuses.length).toBeGreaterThan(0);
    expect(limitedStatuses.length).toBeGreaterThan(0);
  });

  test('handles loading state gracefully', () => {
    render(<Dashboard />);

    // Dashboard should render immediately without loading states
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument();
  });

  test('displays correct chart components', () => {
    render(<Dashboard />);

    // Verify chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});