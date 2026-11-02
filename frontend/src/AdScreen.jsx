import { useEffect, useRef, useState } from 'react';
import Clock from './Clock.jsx';
import FitText from './FitText.jsx';

// Advert videos: put the files in frontend/public/videos/ and list them here.
// They play one after another, then start again from the first.
export const AD_VIDEOS = ['/videos/ad.mp4'];

// Hidden video that loads the advert while a flight is on screen,
// so the advert starts at once when the flight goes off (no black loading gap)
export function AdPreload() {
  if (!AD_VIDEOS.length) return null;
  return <video src={AD_VIDEOS[0]} preload="auto" muted playsInline style={{ display: 'none' }} />;
}

// Full-screen advert video with a strip underneath: gate number, next flight, clock.
// "next" = { flight, city, time } of the gate's next flight, or null.
export default function AdScreen({ gate, next, offline, fallback }) {
  const videoRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(0); // videos that failed in a row

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true; // browsers only autoplay a muted video
    video.play().catch(() => {});
  }, [index]);

  // No video, or none of them could be played: show the normal gate screen instead
  if (!AD_VIDEOS.length || failed >= AD_VIDEOS.length) return fallback;

  const nextFlightText = next ? `${next.flight}   ·   ${next.city}   ·   ${next.time}` : '';

  return (
    <div className="ad-screen">
      <div className="ad-stage">
        <video
          key={AD_VIDEOS[index]}
          ref={videoRef}
          className="ad-video"
          src={AD_VIDEOS[index]}
          autoPlay
          muted
          playsInline
          loop={AD_VIDEOS.length === 1}
          onPlaying={() => setFailed(0)}
          onEnded={() => setIndex((i) => (i + 1) % AD_VIDEOS.length)}
          onError={() => {
            setFailed((n) => n + 1);
            setIndex((i) => (i + 1) % AD_VIDEOS.length);
          }}
        />
      </div>

      <div className="ad-strip">
        <div className="ad-strip-gate">
          <span className="ad-strip-gate-label">GATE</span>
          <span className="ad-strip-gate-number">{gate}</span>
        </div>

        <div className="ad-strip-next">
          {next ? (
            <>
              <div className="ad-strip-label">NEXT FLIGHT</div>
              <FitText className="ad-strip-next-value" watch={nextFlightText}>
                {nextFlightText}
              </FitText>
            </>
          ) : (
            <div className="ad-strip-next-value">Have a pleasant journey</div>
          )}
        </div>

        <div className="ad-strip-clock">
          <Clock />
          {offline && <span className="offline-dot" title="Server unreachable" />}
        </div>
      </div>
    </div>
  );
}