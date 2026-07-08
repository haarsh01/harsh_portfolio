import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CalendarDays } from 'lucide-react';
import { isReducedMotion } from '#utils/motion.js';
import {
  buildContributionGrid, getLevelRank, getLevelLabel, WEEKDAY_LABELS, sumContributions, CONTRIBUTION_LEVELS,
} from '#utils/githubContributions.js';

const VISIBLE_WEEKDAY_ROWS = [1, 3, 5]; // Mon, Wed, Fri — matches GitHub's own convention of not labeling every row

function cellKey(weekIndex, dayIndex) {
  return `${weekIndex}-${dayIndex}`;
}

function describeCell(day) {
  if (!day) return '';
  const label = dayjs(day.date).format('MMMM D, YYYY');
  if (day.count === 0) return `No contributions on ${label}`;
  return `${day.count} contribution${day.count === 1 ? '' : 's'} on ${label}`;
}

// Builds the accessible grid pattern: role="grid"/"row"/"gridcell", roving
// tabIndex (one Tab stop for the whole grid, not 365), and Arrow/Home/End
// navigation — plus a hover/focus/pinned tooltip positioned with
// `position: fixed` so it can never be clipped by the calendar's own
// horizontal scroll region (a plain absolutely-positioned tooltip inside
// an `overflow-x: auto` container would be).
const GitHubContributionCalendar = ({ days, synced }) => {
  const { weeks, monthLabels } = useMemo(() => buildContributionGrid(days), [days]);

  const lastCoords = useMemo(() => {
    let found = { weekIndex: 0, dayIndex: 0 };
    weeks.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        if (day) found = { weekIndex, dayIndex };
      });
    });
    return found;
  }, [weeks]);

  const [activeCoords, setActiveCoords] = useState(lastCoords);
  const [syncedLastCoords, setSyncedLastCoords] = useState(lastCoords);
  const [hoverCoords, setHoverCoords] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);
  const [pinnedCoords, setPinnedCoords] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState(null);

  const cellRefs = useRef(new Map());
  const shellRef = useRef(null);
  const gridRef = useRef(null);

  // Resets activeCoords to point at the newest day whenever the underlying
  // data changes (a new `lastCoords` reference from the memo above) —
  // adjusted during render rather than in an effect, since keyboard/click
  // navigation below already changes activeCoords independently and this
  // only needs to react to `lastCoords` itself changing.
  if (lastCoords !== syncedLastCoords) {
    setSyncedLastCoords(lastCoords);
    setActiveCoords(lastCoords);
  }

  const displayCoords = pinnedCoords ?? hoverCoords ?? focusCoords;
  const displayDay = displayCoords ? weeks[displayCoords.weekIndex]?.[displayCoords.dayIndex] : null;

  useEffect(() => {
    // Nothing to measure — and nothing to reset either: the tooltip's own
    // render guard below already requires `displayDay` to be truthy, so a
    // stale `tooltipStyle` value sitting unused in state is harmless.
    if (!displayCoords || !displayDay) return;
    const cellEl = cellRefs.current.get(cellKey(displayCoords.weekIndex, displayCoords.dayIndex));
    const shellEl = shellRef.current;
    if (!cellEl || !shellEl) return;

    const cellRect = cellEl.getBoundingClientRect();
    const shellRect = shellEl.getBoundingClientRect();
    let left = cellRect.left + cellRect.width / 2;
    const top = cellRect.top;

    // Clamp horizontally so the tooltip never spills outside the window's
    // own card — a fixed-position element still becomes contained by the
    // nearest transformed ancestor (this window surface, which GSAP
    // animates via `transform`), so clamping against this shell keeps it
    // inside the visible window rather than the full browser viewport.
    const minLeft = shellRect.left + 60;
    const maxLeft = shellRect.right - 60;
    left = Math.min(Math.max(left, minLeft), maxLeft);

    setTooltipStyle({ left, top });
  }, [displayCoords, displayDay]);

  const findNearestFilled = (weekIndex, dayIndex) => {
    if (weeks[weekIndex]?.[dayIndex]) return { weekIndex, dayIndex };
    return null;
  };

  const moveFocus = (weekIndex, dayIndex) => {
    const clampedWeek = Math.min(Math.max(weekIndex, 0), weeks.length - 1);
    const clampedDay = Math.min(Math.max(dayIndex, 0), 6);
    const target = findNearestFilled(clampedWeek, clampedDay) ?? activeCoords;
    setActiveCoords(target);
    const el = cellRefs.current.get(cellKey(target.weekIndex, target.dayIndex));
    el?.focus();
  };

  const handleKeyDown = (event, weekIndex, dayIndex) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(weekIndex + 1, dayIndex);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(weekIndex - 1, dayIndex);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(weekIndex, dayIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(weekIndex, dayIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0, 0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(lastCoords.weekIndex, lastCoords.dayIndex);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        setPinnedCoords((prev) => (
          prev && prev.weekIndex === weekIndex && prev.dayIndex === dayIndex
            ? null
            : { weekIndex, dayIndex }
        ));
        break;
      case 'Escape':
        if (pinnedCoords) {
          event.preventDefault();
          event.stopPropagation();
          setPinnedCoords(null);
        }
        break;
      default:
        break;
    }
  };

  useGSAP(() => {
    if (isReducedMotion() || !gridRef.current) return undefined;
    const cells = gridRef.current.querySelectorAll('.github-calendar__day[data-has-data="true"]');
    if (!cells.length) return undefined;
    gsap.fromTo(
      cells,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power1.out', stagger: { each: 0.0006, from: 'start' } },
    );
    return undefined;
  }, { scope: gridRef, dependencies: [weeks.length] });

  if (!synced) {
    return (
      <div className="github-empty">
        <CalendarDays size={22} aria-hidden="true" />
        <p>GitHub contribution activity has not been synchronized yet.</p>
      </div>
    );
  }

  const totalForSummary = sumContributions(days);

  return (
    <div className="github-calendar-shell" ref={shellRef}>
      <p id="github-calendar-summary" className="sr-only">
        {totalForSummary} GitHub contribution{totalForSummary === 1 ? '' : 's'} across {days.length} days.
        Use arrow keys to explore individual dates.
      </p>
      <p className="github-calendar__scroll-hint" aria-hidden="true">Scroll to see the full year →</p>
      <div className="github-calendar-scroll">
        <div className="github-calendar" ref={gridRef}>
          <div className="github-calendar__months" aria-hidden="true">
            {monthLabels.map(({ weekIndex, label }) => (
              <span key={weekIndex} style={{ '--col': weekIndex }}>{label}</span>
            ))}
          </div>

          <div className="github-calendar__body">
            <div className="github-calendar__weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label, i) => (
                <span key={label} style={{ '--row': i }}>
                  {VISIBLE_WEEKDAY_ROWS.includes(i) ? label : ''}
                </span>
              ))}
            </div>

            <div
              className="github-calendar__weeks"
              role="grid"
              aria-label="GitHub contribution calendar, one square per day"
              aria-describedby="github-calendar-summary"
            >
              {weeks.map((week, weekIndex) => (
                <div className="github-calendar__week" role="row" key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    const isActive = activeCoords.weekIndex === weekIndex && activeCoords.dayIndex === dayIndex;
                    if (!day) {
                      return <div key={dayIndex} className="github-calendar__day github-calendar__day--empty" aria-hidden="true" />;
                    }
                    const rank = getLevelRank(day.level, day.count);
                    return (
                      <div
                        key={dayIndex}
                        ref={(el) => {
                          if (el) cellRefs.current.set(cellKey(weekIndex, dayIndex), el);
                          else cellRefs.current.delete(cellKey(weekIndex, dayIndex));
                        }}
                        className="github-calendar__day"
                        role="gridcell"
                        data-level={rank}
                        data-has-data="true"
                        tabIndex={isActive ? 0 : -1}
                        aria-label={describeCell(day)}
                        aria-selected={pinnedCoords?.weekIndex === weekIndex && pinnedCoords?.dayIndex === dayIndex}
                        onFocus={() => { setActiveCoords({ weekIndex, dayIndex }); setFocusCoords({ weekIndex, dayIndex }); }}
                        onBlur={() => setFocusCoords((prev) => (
                          prev?.weekIndex === weekIndex && prev?.dayIndex === dayIndex ? null : prev
                        ))}
                        onMouseEnter={() => setHoverCoords({ weekIndex, dayIndex })}
                        onMouseLeave={() => setHoverCoords((prev) => (
                          prev?.weekIndex === weekIndex && prev?.dayIndex === dayIndex ? null : prev
                        ))}
                        onClick={() => {
                          setActiveCoords({ weekIndex, dayIndex });
                          setPinnedCoords((prev) => (
                            prev && prev.weekIndex === weekIndex && prev.dayIndex === dayIndex
                              ? null
                              : { weekIndex, dayIndex }
                          ));
                        }}
                        onKeyDown={(event) => handleKeyDown(event, weekIndex, dayIndex)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="github-calendar__legend">
        <span aria-hidden="true">Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="github-calendar__legend-swatch"
            data-level={level}
            role="img"
            aria-label={getLevelLabel(CONTRIBUTION_LEVELS[level])}
          />
        ))}
        <span aria-hidden="true">More</span>
        <span className="sr-only">
          Contribution intensity legend, five levels from no activity to very high activity.
        </span>
      </div>

      {displayDay && tooltipStyle ? (
        <div
          className="github-calendar__tooltip"
          role="tooltip"
          style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
        >
          <p className="github-calendar__tooltip-count">
            {displayDay.count === 0 ? 'No contributions' : `${displayDay.count} contribution${displayDay.count === 1 ? '' : 's'}`}
          </p>
          <p className="github-calendar__tooltip-date">{dayjs(displayDay.date).format('MMMM D, YYYY')}</p>
          <p className="github-calendar__tooltip-level">{getLevelLabel(getLevelRank(displayDay.level, displayDay.count) >= 0 ? displayDay.level : 'NONE')}</p>
        </div>
      ) : null}
    </div>
  );
};

export default GitHubContributionCalendar;
