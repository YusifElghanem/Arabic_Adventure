import { useState } from 'react';
import { COSTUMES, SKINS, SHOP_ITEMS, TOOLS, type ShopKind } from '@/game/shop';
import { useGameStore } from '@/stores/useGameStore';
import { playSound, unlockAudio } from '@/utils/sound';
import AvatarPreview from './AvatarPreview';
import { CheckIcon, CloseIcon, CoinIcon } from './icons';

/**
 * The coin shop: costumes, colour skins and tools. Icon-only, like the rest
 * of the game: tap a tile to try it on the big preview, then the big button
 * buys it (coin + price) or wears it (tick). Not enough coins → a soft wiggle.
 */

const emoji = (name: string) => `${import.meta.env.BASE_URL}emoji/${name}.svg`;

const TABS: { kind: ShopKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'costume', label: 'لبس', icon: <img src={emoji('bear')} alt="" className="size-10" /> },
  { kind: 'skin', label: 'ألوان', icon: <Swatch colors={['#ff8cc6', '#6fe3c0', '#6cc8ff', '#ffd23f']} size={40} /> },
  { kind: 'tool', label: 'أدوات', icon: <img src={emoji('bubbles')} alt="" className="size-10" /> },
];

export default function ShopScreen({ onClose }: { onClose: () => void }) {
  const coins = useGameStore((s) => s.coins);
  const owned = useGameStore((s) => s.ownedItems);
  const costume = useGameStore((s) => s.costume);
  const skin = useGameStore((s) => s.skin);
  const tool = useGameStore((s) => s.tool);
  const outfit = useGameStore((s) => s.outfit);
  const buyItem = useGameStore((s) => s.buyItem);
  const equipItem = useGameStore((s) => s.equipItem);
  const [tab, setTab] = useState<ShopKind>('costume');
  const [selected, setSelected] = useState<string>(`costume:${costume}`);
  const [wiggle, setWiggle] = useState(0);

  const item = SHOP_ITEMS.find((i) => i.id === selected)!;
  const isOwned = owned.includes(item.id);
  const isWorn =
    (item.kind === 'costume' && outfit === 'onesie' && costume === item.name) ||
    (item.kind === 'skin' && outfit === 'onesie' && skin === item.name) ||
    (item.kind === 'tool' && tool === item.name);
  const affordable = coins >= item.price;

  const act = () => {
    unlockAudio();
    if (isOwned) {
      playSound('tap');
      equipItem(item.id);
    } else if (buyItem(item.id)) {
      playSound('buy');
    } else {
      playSound('bump');
      setWiggle((w) => w + 1);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-gradient-to-b from-amber-200 via-rose-100 to-sky-100" role="dialog" aria-modal="true" aria-label="المحل">
      <div dir="ltr" className="flex shrink-0 items-center justify-between p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 rounded-full bg-white/85 py-1.5 ps-1.5 pe-5 shadow-lg ring-2 ring-white" role="status" aria-label={`${coins}`}>
          <CoinIcon size={44} />
          <span className="font-display text-3xl font-extrabold text-amber-600">{coins}</span>
        </div>
        <button
          type="button"
          aria-label="رجوع"
          onClick={() => {
            playSound('tap');
            onClose();
          }}
          className="grid size-16 place-items-center rounded-full bg-white/85 text-sky-700 shadow-lg ring-2 ring-white transition active:scale-95"
        >
          <CloseIcon size={30} />
        </button>
      </div>

      <div dir="ltr" className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:flex-row" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {/* Preview + the big buy / wear button */}
        <div className="flex shrink-0 flex-row items-center justify-center gap-4 sm:w-64 sm:flex-col">
          <div className="relative grid aspect-[150/170] h-36 place-items-center rounded-[2rem] bg-white/70 shadow-inner ring-4 ring-white sm:h-56">
            <AvatarPreview
              className="h-full w-full"
              outfit={item.kind === 'tool' ? outfit : 'onesie'}
              costume={item.kind === 'costume' ? item.name : costume}
              skin={item.kind === 'skin' ? item.name : item.kind === 'costume' ? 'natural' : skin}
            />
            {item.kind === 'tool' && <img src={emoji(TOOLS[item.name as keyof typeof TOOLS].emoji)} alt="" className="absolute -right-3 bottom-2 size-16 drop-shadow" />}
          </div>
          <button
            key={wiggle}
            type="button"
            aria-label={isOwned ? 'البس' : 'اشتري'}
            onClick={act}
            className={`flex h-20 min-w-36 items-center justify-center gap-2 rounded-full px-6 font-display text-3xl font-extrabold text-white shadow-[0_8px_0_rgba(0,0,0,0.18)] ring-4 ring-white transition active:translate-y-1 ${
              isOwned ? (isWorn ? 'bg-emerald-400' : 'bg-emerald-500') : affordable ? 'bg-amber-500' : 'bg-slate-400'
            } ${wiggle ? 'animate-[wiggle_300ms_ease-in-out_2]' : ''}`}
          >
            {isOwned ? (
              <CheckIcon size={44} />
            ) : (
              <>
                <CoinIcon size={40} />
                {item.price}
              </>
            )}
          </button>
        </div>

        {/* Tabs + item tiles */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 justify-center gap-3" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.kind}
                type="button"
                role="tab"
                aria-selected={tab === t.kind}
                aria-label={t.label}
                onClick={() => {
                  playSound('tap');
                  setTab(t.kind);
                }}
                className={`grid size-16 place-items-center rounded-2xl bg-white shadow-md transition active:scale-95 ${tab === t.kind ? 'ring-4 ring-amber-400' : 'opacity-75 ring-2 ring-white'}`}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-3 p-1">
              {SHOP_ITEMS.filter((i) => i.kind === tab).map((i) => {
                const mine = owned.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    aria-label={i.name}
                    onClick={() => {
                      playSound('tap');
                      setSelected(i.id);
                    }}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-3xl bg-white shadow-[0_5px_0_rgba(0,0,0,0.1)] transition active:scale-95 ${
                      selected === i.id ? 'ring-4 ring-amber-400' : 'ring-2 ring-white'
                    }`}
                  >
                    <ItemArt kind={i.kind} name={i.name} />
                    {mine ? (
                      <span className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-emerald-500 text-white">
                        <CheckIcon size={18} />
                      </span>
                    ) : (
                      <span className="mt-0.5 flex items-center gap-1 font-display text-lg font-extrabold text-amber-600">
                        <CoinIcon size={20} />
                        {i.price}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemArt({ kind, name }: { kind: ShopKind; name: string }) {
  if (kind === 'costume') return <AvatarPreview className="aspect-[150/170] h-16" outfit="onesie" costume={name} skin="natural" />;
  if (kind === 'tool') return <img src={emoji(TOOLS[name as keyof typeof TOOLS].emoji)} alt="" className="size-14" />;
  const colors = SKINS[name]?.colors;
  return colors ? (
    <Swatch colors={[colors.base, colors.light, colors.deep, colors.paw]} size={56} />
  ) : (
    // "Natural": each costume's own colours.
    <Swatch colors={Object.values(COSTUMES).slice(0, 4).map((c) => c.colors.base)} size={56} />
  );
}

function Swatch({ colors, size }: { colors: string[]; size: number }) {
  const step = 360 / colors.length;
  const gradient = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
  return <span className="block rounded-full ring-4 ring-white shadow" style={{ width: size, height: size, background: `conic-gradient(${gradient})` }} />;
}
