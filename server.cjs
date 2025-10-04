const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const COLOR_MAP = {
  C1: { name: 'White', hex: '#FFFFFF' },
  C2: { name: 'Dark Gray', hex: '#4B5563' },
  C3: { name: 'Red', hex: '#EF4444' },
  C4: { name: 'Blue', hex: '#3B82F6' },
  C5: { name: 'Green', hex: '#22C55E' },
  C6: { name: 'Yellow', hex: '#FACC15' },
  C7: { name: 'Orange', hex: '#F97316' },
  C8: { name: 'Purple', hex: '#A855F7' },
  C9: { name: 'Pink', hex: '#EC4899' },
  C10: { name: 'Teal', hex: '#14B8A6' },
  C11: { name: 'Amber', hex: '#F59E0B' },
  C12: { name: 'Cyan', hex: '#06B6D4' }
};

const COLOR_DISTRIBUTION = [
  { color: 'C1', count: 25 },
  { color: 'C2', count: 20 },
  { color: 'C3', count: 15 },
  { color: 'C4', count: 15 },
  { color: 'C5', count: 12 },
  { color: 'C6', count: 8 },
  { color: 'C7', count: 7 },
  { color: 'C8', count: 6 },
  { color: 'C9', count: 4 },
  { color: 'C10', count: 3 },
  { color: 'C11', count: 3 },
  { color: 'C12', count: 2 }
];

class ColorSequencingSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.totalCarsProcessed = 0;
    this.processedThisHour = 0;
    this.hourStartTime = Date.now();
    this.recentSequence = [];

    this.carBuffer = [];
    COLOR_DISTRIBUTION.forEach(({ color, count }) => {
      for (let i = 0; i < count; i++) {
        this.carBuffer.push(color);
      }
    });
    this.shuffleArray(this.carBuffer);

    this.ovens = {
      O1: { status: 'active', lastToggle: Date.now() },
      O2: { status: 'active', lastToggle: Date.now() }
    };

    this.lines = {
      L1: { status: 'active', cars: [], capacity: 14, oven: 'O1', lastBreakdown: 0 },
      L2: { status: 'active', cars: [], capacity: 14, oven: 'O1', lastBreakdown: 0 },
      L3: { status: 'active', cars: [], capacity: 14, oven: 'O1', lastBreakdown: 0 },
      L4: { status: 'active', cars: [], capacity: 14, oven: 'O1', lastBreakdown: 0 },
      L5: { status: 'active', cars: [], capacity: 16, oven: 'O2', lastBreakdown: 0 },
      L6: { status: 'active', cars: [], capacity: 16, oven: 'O2', lastBreakdown: 0 },
      L7: { status: 'active', cars: [], capacity: 16, oven: 'O2', lastBreakdown: 0 },
      L8: { status: 'active', cars: [], capacity: 16, oven: 'O2', lastBreakdown: 0 },
      L9: { status: 'active', cars: [], capacity: 16, oven: 'O2', lastBreakdown: 0 }
    };

    this.mainLine = {
      feedingFrom: null,
      currentCar: null
    };

    this.lastFedLine = null;
    this.activeAlerts = 0;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
  }

  simulateBreakdown() {
    const lineIds = Object.keys(this.lines);
    const activeLines = lineIds.filter(id => this.lines[id].status === 'active');

    if (activeLines.length > 2) {
      const randomLine = activeLines[Math.floor(Math.random() * activeLines.length)];
      const now = Date.now();

      if (now - this.lines[randomLine].lastBreakdown > 15000) {
        this.lines[randomLine].status = 'unavailable';
        this.lines[randomLine].lastBreakdown = now;

        setTimeout(() => {
          if (this.lines[randomLine].status === 'unavailable') {
            this.lines[randomLine].status = 'active';
          }
        }, 8000);
      }
    }
  }

  getAvailableLines(ovenId) {
    return Object.entries(this.lines)
      .filter(([_, line]) => line.oven === ovenId && line.status !== 'unavailable')
      .map(([id, _]) => id);
  }

  findBestLine(color, ovenId) {
    const availableLines = this.getAvailableLines(ovenId);

    const lineWithSameColor = availableLines.find(lineId => {
      const line = this.lines[lineId];
      return line.cars.length > 0 &&
             line.cars[line.cars.length - 1] === color &&
             line.cars.length < line.capacity;
    });

    if (lineWithSameColor) return lineWithSameColor;

    const notFullLines = availableLines.filter(lineId =>
      this.lines[lineId].cars.length < this.lines[lineId].capacity
    );

    if (notFullLines.length === 0) return null;

    notFullLines.sort((a, b) => this.lines[a].cars.length - this.lines[b].cars.length);

    return notFullLines[0];
  }

  processIncomingCars() {
    if (this.carBuffer.length === 0) return;

    const carsToProcess = Math.min(2, this.carBuffer.length);

    for (let i = 0; i < carsToProcess; i++) {
      const car = this.carBuffer.shift();

      const ovenId = Math.random() < 0.5 ? 'O1' : 'O2';

      if (this.ovens[ovenId].status !== 'active') {
        const alternateOven = ovenId === 'O1' ? 'O2' : 'O1';
        if (this.ovens[alternateOven].status === 'active') {
          const lineId = this.findBestLine(car, alternateOven);
          if (lineId) {
            this.lines[lineId].cars.push(car);
          } else {
            this.carBuffer.unshift(car);
          }
        } else {
          this.carBuffer.unshift(car);
        }
        continue;
      }

      const lineId = this.findBestLine(car, ovenId);

      if (!lineId) {
        const alternateOven = ovenId === 'O1' ? 'O2' : 'O1';
        const alternateLineId = this.findBestLine(car, alternateOven);

        if (alternateLineId) {
          this.lines[alternateLineId].cars.push(car);
        } else {
          this.carBuffer.unshift(car);
          this.activeAlerts++;
        }
      } else {
        this.lines[lineId].cars.push(car);
      }
    }

    Object.keys(this.lines).forEach(lineId => {
      const line = this.lines[lineId];
      if (line.cars.length >= line.capacity) {
        line.status = 'full';
      } else if (line.status === 'full') {
        line.status = 'active';
      }
    });
  }

  selectNextLine() {
    const availableLines = Object.entries(this.lines)
      .filter(([_, line]) => line.status !== 'unavailable' && line.cars.length > 0)
      .map(([id, _]) => id);

    if (availableLines.length === 0) return null;

    const colorGroups = {};
    availableLines.forEach(lineId => {
      const color = this.lines[lineId].cars[0];
      if (!colorGroups[color]) colorGroups[color] = [];
      colorGroups[color].push(lineId);
    });

    const sortedColors = Object.entries(colorGroups)
      .sort((a, b) => {
        const totalA = a[1].reduce((sum, lineId) =>
          sum + this.lines[lineId].cars.filter(c => c === a[0]).length, 0);
        const totalB = b[1].reduce((sum, lineId) =>
          sum + this.lines[lineId].cars.filter(c => c === b[0]).length, 0);
        return totalB - totalA;
      });

    if (sortedColors.length > 0) {
      const bestColorLines = sortedColors[0][1];
      return bestColorLines[0];
    }

    return availableLines[0];
  }

  processMainLine() {
    if (!this.mainLine.currentCar) {
      const nextLine = this.selectNextLine();

      if (nextLine && this.lines[nextLine].cars.length > 0) {
        const car = this.lines[nextLine].cars.shift();
        this.mainLine.currentCar = car;
        this.mainLine.feedingFrom = nextLine;

        if (this.lines[nextLine].status === 'full' && this.lines[nextLine].cars.length < this.lines[nextLine].capacity) {
          this.lines[nextLine].status = 'active';
        }
      }
    } else {
      this.recentSequence.push(this.mainLine.currentCar);
      if (this.recentSequence.length > 15) {
        this.recentSequence.shift();
      }

      this.totalCarsProcessed++;
      this.processedThisHour++;
      this.mainLine.currentCar = null;
      this.mainLine.feedingFrom = null;
    }
  }

  tick() {
    if (!this.isRunning || this.isPaused) return;

    if (Math.random() < 0.02) {
      this.simulateBreakdown();
    }

    this.processIncomingCars();
    this.processMainLine();

    const hourElapsed = (Date.now() - this.hourStartTime) / 1000 / 3600;
    if (hourElapsed >= 1) {
      this.processedThisHour = 0;
      this.hourStartTime = Date.now();
    }

    this.activeAlerts = 0;
    Object.values(this.lines).forEach(line => {
      if (line.status === 'full' || line.status === 'unavailable') {
        this.activeAlerts++;
      }
    });
  }

  getStatus() {
    const hourElapsed = (Date.now() - this.hourStartTime) / 1000 / 3600;
    const jph = hourElapsed > 0 ? (this.processedThisHour / hourElapsed) : 0;

    return {
      kpis: {
        jph: Math.round(jph * 10) / 10,
        total_cars_processed: this.totalCarsProcessed,
        active_alerts: this.activeAlerts
      },
      recent_sequence: [...this.recentSequence],
      ovens: this.ovens,
      lines: Object.entries(this.lines).reduce((acc, [id, line]) => {
        acc[id] = {
          status: line.status,
          cars: [...line.cars],
          count: line.cars.length,
          capacity: line.capacity
        };
        return acc;
      }, {}),
      main_line: {
        feeding_from: this.mainLine.feedingFrom,
        current_car: this.mainLine.currentCar
      },
      is_running: this.isRunning,
      is_paused: this.isPaused
    };
  }
}

const simulator = new ColorSequencingSimulator();

setInterval(() => {
  simulator.tick();
}, 500);

app.get('/api/live_status', (req, res) => {
  res.json(simulator.getStatus());
});

app.post('/api/start', (req, res) => {
  simulator.start();
  res.json({ success: true });
});

app.post('/api/pause', (req, res) => {
  simulator.pause();
  res.json({ success: true });
});

app.post('/api/reset', (req, res) => {
  simulator.reset();
  res.json({ success: true });
});

app.get('/api/colors', (req, res) => {
  res.json(COLOR_MAP);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
