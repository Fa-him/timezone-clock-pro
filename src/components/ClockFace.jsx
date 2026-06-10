import { Clock3 } from 'lucide-react';
import {
    getClockParts,
    getDateDisplay,
    getDigitalDisplay,
    getShortZoneDisplay
} from '../lib/time.js';

export default function ClockFace({ date, zone }) {
    const { hour, minute, second } = getClockParts(date, zone.name);

    const secondAngle = second * 6;
    const minuteAngle = minute * 6 + second * 0.1;
    const hourAngle = (hour % 12) * 30 + minute * 0.5;

    const marks = Array.from({ length: 60 }, (_, index) => index);

    return (
        <section className="clock-stage" aria-label={`Current time in ${zone.label}`}>
            <div className="location-pill">
                <Clock3 size={18} />
                <span>{zone.label}</span>
            </div>

            <div className="analog-clock" role="img" aria-label="Analog clock">
                <div className="clock-glow" />
                {marks.map((mark) => (
                    <span
                        key={mark}
                        className={mark % 5 === 0 ? 'clock-mark clock-mark-major' : 'clock-mark'}
                        style={{ '--mark-angle': `${mark * 6}deg` }}
                    />
                ))}

                {[12, 3, 6, 9].map((number) => (
                    <span key={number} className={`clock-number clock-number-${number}`}>
                        {number}
                    </span>
                ))}

                <span className="hand hour-hand" style={{ '--hand-angle': `${hourAngle}deg` }} />
                <span className="hand minute-hand" style={{ '--hand-angle': `${minuteAngle}deg` }} />
                <span className="hand second-hand" style={{ '--hand-angle': `${secondAngle}deg` }} />
                <span className="clock-center" />
            </div>

            <div className="digital-time">{getDigitalDisplay(date, zone.name)}</div>
            <div className="date-line">{getDateDisplay(date, zone.name)}</div>
            <div className="timezone-line">
                {zone.name} · {getShortZoneDisplay(date, zone.name)}
            </div>
        </section>
    );
}
