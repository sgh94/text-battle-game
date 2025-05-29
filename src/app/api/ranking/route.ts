import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import { Character, ScoreMember } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50"); // Increased default value to 50
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const league = request.nextUrl.searchParams.get("league") || "general";

    console.log(`Fetching rankings for league: ${league} with limit: ${limit}`);

    // Ranking key by league (sorted set)
    const rankingKey = `league:${league}:ranking`;

    // 1. Check if the sorted set for this league exists
    const exists = await kv.exists(rankingKey);
    if (!exists) {
      console.log(`Ranking for league ${league} doesn't exist yet`);
      return NextResponse.json({ rankings: [], total: 0 });
    }

    // 1.5. Get total count for this league
    const totalCount = await kv.zcard(rankingKey);
    console.log(`Total characters in league ${league}: ${totalCount}`);

    // 2. Get league rankings (score in descending order)
    // If there are 10+ characters, show top 10, otherwise show all
    const actualLimit = totalCount >= 10 ? Math.min(10, limit) : totalCount;
    const topRankings = await kv.zrange(
      rankingKey,
      offset,
      offset + actualLimit - 1,
      { withScores: true, rev: true }
    );

    if (!topRankings || topRankings.length === 0) {
      console.log(`No rankings found for league ${league}`);
      return NextResponse.json({ rankings: [], total: totalCount });
    }

    // 3. Separate IDs and scores
    const characterScores: Array<{ id: string; score: number }> = [];
    for (let i = 0; i < topRankings.length; i += 2) {
      const id = String(topRankings[i]);
      const score = Number(topRankings[i + 1]);
      characterScores.push({ id, score });
    }

    console.log(
      `Found ${characterScores.length} top characters for league ${league}`
    );

    // 4. Get character information (parallel requests)
    const rankingsData = await Promise.all(
      characterScores.map(async ({ id, score }, index) => {
        try {
          // Get character information
          const character = await kv.hgetall<Character>(`character:${id}`);

          if (!character) {
            console.log(`Character ${id} not found`);
            return null;
          }

          // League filtering - each league is independent, so it must match exactly
          if (character.league !== league) {
            console.log(
              `Character ${id} (${character.name}) has league ${character.league}, not ${league}`
            );
            return null;
          }

          // Add ranking information
          return {
            ...character,
            rank: offset + index + 1,
            elo: score, // Use score from Sorted Set
          };
        } catch (err) {
          console.error(`Error fetching character ${id}:`, err);
          return null;
        }
      })
    );

    // Filter valid results only
    const validRankings = rankingsData.filter(Boolean);

    console.log(
      `Returning ${validRankings.length} ranked characters for league ${league} (total: ${totalCount})`
    );

    return NextResponse.json({
      rankings: validRankings,
      total: totalCount,
      showing: validRankings.length,
    });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
