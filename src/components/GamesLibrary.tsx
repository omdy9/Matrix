import { useState } from 'react';
import { Gamepad, Laptop, Search, Star, Zap, Play } from 'lucide-react';

export interface GameItem {
  id: string;
  title: string;
  platform: 'PC' | 'PS5' | 'Both';
  genre: string;
  modes: string;
  specs: string;
  rating: number;
  image: string;
  description: string;
  highlight?: boolean;
}

const GAMES_DATA: GameItem[] = [
  // PC GAMES (10)
  {
    id: 'gtav',
    title: 'Grand Theft Auto V / Online',
    platform: 'Both',
    genre: 'Open World / Action',
    modes: 'Single Player & Online Multiplayer',
    specs: '4K Ultra Settings | 144Hz | FiveM Modded Rigs',
    rating: 4.9,
    image: '/gtav_poster.jpg',
    description: 'Explore Los Santos, perform high-stakes heists, and drive supercar fleets with ultra-high graphics and custom servers.',
    highlight: true,
  },
  {
    id: 'codmw3',
    title: 'Call of Duty: Modern Warfare III',
    platform: 'Both',
    genre: 'Tactical FPS / Warzone',
    modes: 'Multiplayer & Battle Royale',
    specs: '240Hz Esports Rigs | DLSS 3.0 Low Latency',
    rating: 4.8,
    image: '/cod_poster.jpg',
    description: 'Engage in fast-paced military firefights, competitive Ranked Play, and intense Warzone Squad Battle Royale.',
    highlight: true,
  },
  {
    id: 'fifa24',
    title: 'EA Sports FC 24 (FIFA 24)',
    platform: 'Both',
    genre: 'Sports / Football',
    modes: '1-4 Player Local PvP & Co-Op',
    specs: '4K 120Hz | DualSense Haptic Feedback',
    rating: 4.9,
    image: '/fifa_poster.jpg',
    description: 'The ultimate football match experience. Play 2v2 or 1v1 local multiplayer matches with friends on big screen displays.',
    highlight: true,
  },
  {
    id: 'valorant',
    title: 'Valorant',
    platform: 'PC',
    genre: 'Tactical FPS',
    modes: '5v5 Competitive Multiplayer',
    specs: '240Hz Refresh Rate | 1ms Gaming Monitor',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    description: 'Precision character-based tactical shooter. Pre-installed with optimized esports keybinds and low-latency mouse settings.',
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk 2077: Phantom Liberty',
    platform: 'PC',
    genre: 'Sci-Fi RPG',
    modes: 'Single Player',
    specs: 'NVIDIA RTX Ray Tracing Overdrive | 4K Ultra',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    description: 'Step into Night City as V, a mercenary outlaw. Powered by RTX 4080 graphics for breathtaking ray-traced visuals.',
  },
  {
    id: 'cs2',
    title: 'Counter-Strike 2 (CS2)',
    platform: 'PC',
    genre: 'Esports FPS',
    modes: '5v5 Tactical Matchmaking',
    specs: '360FPS Ultra Low Latency Rigs',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    description: 'The premier tactical shooter. Sub-tick updates, smoke physics, and 300+ FPS performance guaranteed on all stations.',
  },
  {
    id: 'rdr2',
    title: 'Red Dead Redemption 2',
    platform: 'PC',
    genre: 'Open World Western',
    modes: 'Story Campaign & Red Dead Online',
    specs: '4K HDR Ultra Quality Preset',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    description: 'An epic tale of life in America’s unforgiving heartland. Unrivalled atmosphere, breathtaking visuals, and deep narrative.',
  },
  {
    id: 'forza5',
    title: 'Forza Horizon 5',
    platform: 'PC',
    genre: 'Racing / Driving',
    modes: 'Single Player & Open World Online',
    specs: '4K 120FPS | Steering Wheel Compatible',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
    description: 'Drive hundreds of world-class cars across vibrant Mexican landscapes with force feedback wheel support.',
  },
  {
    id: 'dota2',
    title: 'Dota 2',
    platform: 'PC',
    genre: 'MOBA',
    modes: '5v5 Ranked Battle Arena',
    specs: '240Hz | Mechanical Keyboards',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    description: 'The deepest action RTS MOBA. Full steam inventory sync and mechanical gaming keyboards equipped at every rig.',
  },
  {
    id: 'fortnite',
    title: 'Fortnite',
    platform: 'Both',
    genre: 'Battle Royale / Creative',
    modes: 'Solo, Duos, Squads, Zero Build',
    specs: 'Unreal Engine 5 | 240FPS Performance Mode',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    description: 'Jump out of the Battle Bus into Zero Build or classic Battle Royale. High FPS competitive performance guaranteed.',
  },

  // PS5 EXCLUSIVES & LOCAL MULTIPLAYER (5)
  {
    id: 'gow',
    title: 'God of War Ragnarök',
    platform: 'PS5',
    genre: 'Action / Mythic RPG',
    modes: 'Single Player Campaign',
    specs: 'PlayStation 5 | 4K 60FPS | DualSense Haptics',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    description: 'Embark on an epic journey with Kratos and Atreus through Nine Realms. Experience immersive DualSense trigger feedback.',
    highlight: true,
  },
  {
    id: 'spiderman2',
    title: "Marvel's Spider-Man 2",
    platform: 'PS5',
    genre: 'Action / Superhero',
    modes: 'Single Player',
    specs: 'PS5 4K Ray Tracing | 120Hz High Frame Rate',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    description: 'Swing across Marvel’s New York as Peter Parker and Miles Morales. Lightning fast SSD loading and fluid combat.',
  },
  {
    id: 'tekken8',
    title: 'Tekken 8',
    platform: 'PS5',
    genre: 'Fighting / 1v1 PvP',
    modes: '1v1 Local Controller Battles',
    specs: '4K 60FPS | 2 Controllers Included',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    description: 'Fist Meets Fate in Tekken 8! Challenge your friend in 1v1 local fighting matches on PlayStation 5 with zero input delay.',
  },
  {
    id: 'mk1',
    title: 'Mortal Kombat 1',
    platform: 'PS5',
    genre: 'Fighting / 1v1 PvP',
    modes: '1v1 Local Versus & Tournaments',
    specs: '4K 60FPS | Kameo Fighter System',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    description: 'A reborn Mortal Kombat Universe created by Fire God Liu Kang. Unleash bone-crushing fatalities in local 2-player battles.',
  },
  {
    id: 'nba2k24',
    title: 'NBA 2K24',
    platform: 'PS5',
    genre: 'Sports / Basketball',
    modes: '1-4 Player Local Co-Op & PvP',
    specs: '4K 60FPS ProPLAY Realism',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80',
    description: 'Experience next-gen hoops gameplay with ProPLAY technology. Play pickup games or tournament matches with friends.',
  },
];

interface GamesLibraryProps {
  onSelectGameToBook: (platform: 'PC' | 'PS5') => void;
}

export default function GamesLibrary({ onSelectGameToBook }: GamesLibraryProps) {
  const [platformFilter, setPlatformFilter] = useState<'All' | 'PC' | 'PS5'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = GAMES_DATA.filter(game => {
    const matchesPlatform =
      platformFilter === 'All'
        ? true
        : platformFilter === 'PC'
        ? game.platform === 'PC' || game.platform === 'Both'
        : game.platform === 'PS5' || game.platform === 'Both';

    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPlatform && matchesSearch;
  });

  const pcCount = GAMES_DATA.filter(g => g.platform === 'PC' || g.platform === 'Both').length;
  const ps5Count = GAMES_DATA.filter(g => g.platform === 'PS5' || g.platform === 'Both').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="glass-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '32px 28px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(10, 13, 20, 0.95))',
          borderColor: 'rgba(56, 189, 248, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-available">
            <Zap size={12} /> INSTALLED & READY TO PLAY
          </span>
          <span className="badge badge-inuse">
            10 PC Rigs &middot; 5 PS5 Consoles
          </span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
          MATRIX GAMES <span style={{ color: 'var(--neon-blue)' }}>CATALOG</span>
        </h2>
        <p style={{ maxWidth: '680px', margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          All games come pre-installed on high-speed NVMe SSDs with zero download times. 
          Pick your favorite game and book your station now.
        </p>

        {/* Filter Tabs & Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '12px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-muted)'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPlatformFilter('All')}
              className={`btn ${platformFilter === 'All' ? 'btn-neon-blue' : 'btn-secondary'}`}
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }}
            >
              All Games ({GAMES_DATA.length})
            </button>
            <button
              onClick={() => setPlatformFilter('PC')}
              className={`btn ${platformFilter === 'PC' ? 'btn-neon-blue' : 'btn-secondary'}`}
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <Laptop size={14} /> PC Rigs ({pcCount})
            </button>
            <button
              onClick={() => setPlatformFilter('PS5')}
              className={`btn ${platformFilter === 'PS5' ? 'btn-neon-purple' : 'btn-secondary'}`}
              style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <Gamepad size={14} /> PlayStation 5 ({ps5Count})
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search GTA V, FIFA, COD..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}
      >
        {filteredGames.map(game => (
          <div
            key={game.id}
            className={`glass-card ${game.platform === 'PS5' ? 'neon-purple-hover' : 'neon-blue-hover'}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '0',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Image Banner */}
            <div style={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
              <img
                src={game.image}
                alt={game.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.85)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent 40%, rgba(18, 24, 38, 0.98) 100%)'
                }}
              />
              
              {/* Platform Tag */}
              <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                <span className={`badge ${game.platform === 'PS5' ? 'badge-inuse' : 'badge-available'}`}>
                  {game.platform === 'PC' ? <Laptop size={12} /> : <Gamepad size={12} />}
                  {game.platform}
                </span>
                <span className="badge badge-booked">
                  <Star size={11} fill="currentColor" /> {game.rating}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                {game.title}
              </h3>

              <div style={{ fontSize: '0.8rem', color: 'var(--neon-blue)', fontWeight: 600 }}>
                {game.genre} &middot; <span style={{ color: 'var(--text-secondary)' }}>{game.modes}</span>
              </div>

              <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                {game.description}
              </p>

              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '8px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-muted)'
                }}
              >
                ⚡ {game.specs}
              </div>

              <button
                onClick={() => onSelectGameToBook(game.platform === 'PS5' ? 'PS5' : 'PC')}
                className={`btn ${game.platform === 'PS5' ? 'btn-neon-purple' : 'btn-neon-blue'}`}
                style={{ marginTop: '6px', fontSize: '0.8rem', padding: '10px' }}
              >
                <Play size={14} /> Book {game.platform === 'PS5' ? 'PS5 Console' : 'PC Station'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
