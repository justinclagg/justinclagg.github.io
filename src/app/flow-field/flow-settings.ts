export interface FlowSettings {
  particle: 'motes' | 'dashes' | 'trails' | 'bokeh' | 'nodes';
  motion: 'curl' | 'laminar' | 'eddies' | 'tide' | 'thermal' | 'circuit';
  cursor: 'none' | 'wake' | 'stir' | 'attract';
  color: 'white' | 'seafoam' | 'two';
  density: number; speed: number; opacity: number; trail: number;
  radius: number; gridRadius: number; gridOpacity: number; spotRadius: number; highlight: number;
  spot: boolean; grid: boolean; memory: boolean; glow: boolean; quiet: boolean;
}

export const SITE_EFFECT: FlowSettings = {
  particle: 'trails', motion: 'circuit', cursor: 'attract', color: 'seafoam',
  density: 30, speed: 51, opacity: 20, trail: 5,
  radius: 220, gridRadius: 80, gridOpacity: 61, spotRadius: 200, highlight: 100,
  spot: true, grid: true, memory: true, glow: false, quiet: false,
};

export const FLOW_RANGES = {
  density: [10, 100], speed: [10, 100], opacity: [10, 100], trail: [5, 100],
  radius: [80, 300], gridRadius: [40, 250], gridOpacity: [5, 100],
  spotRadius: [60, 300], highlight: [0, 100],
} as const;

const FX_OFF = { quiet:true, spot:false, grid:false, memory:false, glow:false, radius:170,
  gridRadius:100, gridOpacity:35, spotRadius:190, highlight:0 };
const CIRCUIT: Omit<FlowSettings, 'cursor'> = { ...FX_OFF, particle:'trails', motion:'circuit', color:'seafoam', density:35, speed:50, opacity:45, trail:40, highlight:60 };
export const FLOW_PRESETS: Record<string, FlowSettings> = {
  'Site default': SITE_EFFECT,
  'Circuit grid + attract': { ...CIRCUIT, cursor:'attract', grid:true, memory:true, radius:220, gridRadius:100, gridOpacity:35, highlight:65 },
  'Circuit spotlight': { ...CIRCUIT, cursor:'none',    spot:true, memory:true, spotRadius:190, density:50 },
  'Circuit grid':      { ...CIRCUIT, cursor:'wake',    grid:true, memory:true, radius:160 },
  'Circuit routing':   { ...CIRCUIT, cursor:'attract', spot:true, glow:true, radius:220, spotRadius:200 },
  'Circuit blueprint': { ...CIRCUIT, cursor:'none',    grid:true, spot:true, glow:true, memory:true, gridRadius:120, spotRadius:200, opacity:40 },
  'Circuit':      { ...CIRCUIT, cursor:'wake', highlight:0 },
  'Calm current': { ...FX_OFF, particle:'trails',  motion:'curl',    cursor:'wake', color:'seafoam', density:45, speed:40, opacity:45, trail:55 },
  'Wind map':     { ...FX_OFF, particle:'dashes',  motion:'laminar', cursor:'wake', color:'white',   density:55, speed:55, opacity:45, trail:40 },
  'Deep water':   { ...FX_OFF, particle:'bokeh',   motion:'eddies',  cursor:'stir', color:'seafoam', density:50, speed:35, opacity:55, trail:40 },
  'Plankton':     { ...FX_OFF, particle:'motes',   motion:'thermal', cursor:'wake', color:'two',     density:50, speed:35, opacity:50, trail:40 },
  'Tide':         { ...FX_OFF, particle:'trails',  motion:'tide',    cursor:'wake', color:'white',   density:40, speed:45, opacity:40, trail:35 },
  'Network':      { ...FX_OFF, particle:'nodes',   motion:'curl',    cursor:'wake', color:'white',   density:50, speed:30, opacity:45, trail:40 },
};
