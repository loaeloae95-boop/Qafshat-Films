      {/* عناصر الميديا المخفية المستقرة في الـ DOM */}
      {clip.mediaUrl && clip.mediaType === "audio" && (
        <audio
          ref={audioRef}
          src={clip.mediaUrl}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
          style={{ display: "none" }}
        />
      )}

      {clip.mediaUrl && clip.mediaType === "video" && (
        <video
          ref={videoRef}
          src={clip.mediaUrl}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
          style={{ display: "none" }}
        />
      )}
