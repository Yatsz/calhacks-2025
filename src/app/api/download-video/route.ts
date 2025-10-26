import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate if it's an Instagram or TikTok URL
    const isInstagram = url.includes("instagram.com");
    const isTikTok = url.includes("tiktok.com");

    if (!isInstagram && !isTikTok) {
      return NextResponse.json(
        { error: "Only Instagram and TikTok URLs are supported" },
        { status: 400 }
      );
    }

    // Instagram not actually implemented - return error
    if (isInstagram) {
      return NextResponse.json(
        { error: "Instagram video download is currently unavailable. Please try uploading the video directly." },
        { status: 400 }
      );
    }

    let videoUrl = "";
    let thumbnail = "";

    if (isTikTok) {
      // Use TikTok Downloader API
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;

      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
      const data = await response.json();

      console.log("TikWM API response:", data);

      if (data.code !== 0 || !data.data?.play) {
        return NextResponse.json(
          { error: "Failed to download TikTok video" },
          { status: 400 }
        );
      }

      videoUrl = data.data.play;
      thumbnail = data.data.cover;
    }

    // Return the video URL
    return NextResponse.json({
      success: true,
      videoUrl: videoUrl,
      thumbnail: thumbnail,
      filename: `video_${Date.now()}.mp4`,
    });
  } catch (error) {
    console.error("Error downloading video:", error);
    return NextResponse.json(
      { error: "Failed to download video" },
      { status: 500 }
    );
  }
}
