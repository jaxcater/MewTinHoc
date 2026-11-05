import React from 'react';
import { splitAnnouncementLinks } from '../lib/announcementLinks.js';

export default function AnnouncementMessage({ message }) {
  return splitAnnouncementLinks(message).map((part, index) => part.href ? (
    <a key={index} className="ann-message-link" href={part.href} target="_blank" rel="noopener noreferrer"
      aria-label={`${part.text} (mở trong tab mới)`}>{part.text}</a>
  ) : <React.Fragment key={index}>{part.text}</React.Fragment>);
}
