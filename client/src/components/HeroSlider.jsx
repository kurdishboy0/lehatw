import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import handshakeLarge from '../assets/hero/handshake-1600.jpg';
import handshakeSmall from '../assets/hero/handshake-900.jpg';
import typingLarge from '../assets/hero/typing-1600.jpg';
import typingSmall from '../assets/hero/typing-900.jpg';
import deskLarge from '../assets/hero/desk-1600.jpg';
import deskSmall from '../assets/hero/desk-900.jpg';

const ROTATE_MS = 6000;

const SLIDES = [
  { key: 'slide1', large: handshakeLarge, small: handshakeSmall },
  { key: 'slide2', large: typingLarge, small: typingSmall },
  { key: 'slide3', large: deskLarge, small: deskSmall }
];

// The home page hero: three photographs that cross-fade behind the headline.
// The photographs are decorative, so they carry an empty alt and the headline
// is the only thing a screen reader announces.
function HeroSlider() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState(() => new Set());
  // Someone who asked their system to reduce motion gets the first slide and
  // the controls, with nothing moving on its own.
  const [reduceMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const regionRef = useRef(null);

  const go = useCallback((next) => setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused || reduceMotion) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, reduceMotion]);

  // Left and right on the keyboard follow what the arrows do on screen, which
  // is reversed once the page is mirrored.
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const rtl = getComputedStyle(regionRef.current).direction === 'rtl';
    const forward = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    e.preventDefault();
    go(index + (forward ? 1 : -1));
  };

  return (
    <section
      ref={regionRef}
      className="hero"
      aria-roledescription="carousel"
      aria-label={t('hero.carousel_label')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.key}
          className={`hero-slide${i === index ? ' is-active' : ''}`}
          aria-hidden={i !== index}
        >
          {!broken.has(i) && (
            <img
              src={slide.large}
              srcSet={`${slide.small} 900w, ${slide.large} 1600w`}
              sizes="100vw"
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              onError={() => setBroken((current) => new Set(current).add(i))}
            />
          )}
        </div>
      ))}

      <div className="hero-scrim" />

      <div className="hero-copy">
        <div className="hero-copy-inner">
          <h1 key={`h-${index}`} className="hero-title">{t(`hero.${SLIDES[index].key}.heading`)}</h1>
          <span className="hero-rule" />
          <p key={`p-${index}`} className="hero-subtext">{t(`hero.${SLIDES[index].key}.subtext`)}</p>
        </div>
      </div>

      <button type="button" className="hero-arrow hero-arrow-prev" onClick={() => go(index - 1)} aria-label={t('hero.previous')}>
        <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
      </button>
      <button type="button" className="hero-arrow hero-arrow-next" onClick={() => go(index + 1)} aria-label={t('hero.next')}>
        <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="hero-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            className={`hero-dot${i === index ? ' is-active' : ''}`}
            aria-label={t('hero.go_to_slide', { number: i + 1 })}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}

export default HeroSlider;
