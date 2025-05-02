'use client';

import React from 'react';
import { LEAGUES } from '@/lib/discord-roles';

interface LeagueBadgeProps {
  leagueId: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  variant?: 'default' | 'outline' | 'filled';
  className?: string;
}

export default function LeagueBadge({
  leagueId,
  size = 'md',
  showIcon = true,
  showText = true,
  variant = 'default',
  className = '',
}: LeagueBadgeProps) {
  // Normalize league ID
  const normalizedLeagueId = leagueId.toLowerCase();

  // Get league information
  const league = LEAGUES[normalizedLeagueId as keyof typeof LEAGUES];

  if (!league) {
    return null;
  }

  // League name
  const leagueName = league.name || leagueId.charAt(0).toUpperCase() + leagueId.slice(1);

  // League color and style
  const leagueColor = league.color || '#888888';

  // Classes based on badge size
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5',
  };

  // Badge style variants
  const variantClasses = {
    default: `bg-opacity-20 text-opacity-90`,
    outline: `bg-transparent border border-current`,
    filled: `text-white`,
  };

  // Badge style object
  const badgeStyle = {
    backgroundColor: variant === 'filled' ? leagueColor : variant === 'default' ? `${leagueColor}33` : 'transparent',
    color: variant === 'filled' ? 'white' : leagueColor,
    borderColor: variant === 'outline' ? leagueColor : 'transparent',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={badgeStyle}
    >
      {showIcon && (
        <span className="mr-1">{league.icon}</span>
      )}
      {showText && leagueName}
    </span>
  );
}

// All league badges component
export function LeagueBadges({
  leagues,
  size = 'sm',
  showIcons = true,
  variant = 'default',
  className = '',
}: {
  leagues: string[];
  size?: 'sm' | 'md' | 'lg';
  showIcons?: boolean;
  variant?: 'default' | 'outline' | 'filled';
  className?: string;
}) {
  // Sort leagues by priority
  const sortedLeagues = [...leagues].sort((a, b) => {
    const leagueA = LEAGUES[a as keyof typeof LEAGUES];
    const leagueB = LEAGUES[b as keyof typeof LEAGUES];

    if (!leagueA) return 1;
    if (!leagueB) return -1;

    return leagueB.order - leagueA.order;
  });

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {sortedLeagues.map((leagueId) => (
        <LeagueBadge
          key={leagueId}
          leagueId={leagueId}
          size={size}
          showIcon={showIcons}
          variant={variant}
        />
      ))}
    </div>
  );
}
