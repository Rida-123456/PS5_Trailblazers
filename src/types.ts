export interface KPIs {
  jph: number;
  total_cars_processed: number;
  active_alerts: number;
}

export interface Oven {
  status: 'active' | 'stopped';
}

export interface Line {
  status: 'active' | 'full' | 'unavailable';
  cars: string[];
  count: number;
  capacity: number;
}

export interface MainLine {
  feeding_from: string | null;
  current_car: string | null;
}

export interface LiveStatus {
  kpis: KPIs;
  recent_sequence: string[];
  ovens: {
    O1: Oven;
    O2: Oven;
  };
  lines: {
    [key: string]: Line;
  };
  main_line: MainLine;
  is_running: boolean;
  is_paused: boolean;
}

export interface ColorInfo {
  name: string;
  hex: string;
}
