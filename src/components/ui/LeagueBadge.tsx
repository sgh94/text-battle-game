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
  // 리그 ID 정규화
  const normalizedLeagueId = leagueId.toLowerCase();
  
  // 리그 정보 가져오기
  const league = LEAGUES[normalizedLeagueId as keyof typeof LEAGUES];
  
  if (!league) {
    return null;
  }
  
  // 리그 이름
  const leagueName = league.name || leagueId.charAt(0).toUpperCase() + leagueId.slice(1);
  
  // 리그 색상 및 스타일
  const leagueColor = league.color || '#888888';
  
  // 배지 크기에 따른 클래스
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5',
  };
  
  // 배지 스타일 배리언트
  const variantClasses = {
    default: `bg-opacity-20 text-opacity-90`,
    outline: `bg-transparent border border-current`,
    filled: `text-white`,
  };
  
  // 배지 스타일 객체
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

// 모든 리그 뱃지 컴포넌트
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
  // 리그 우선순위 정렬
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
