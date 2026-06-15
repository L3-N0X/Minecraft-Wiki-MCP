FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first (cached layer)
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-editable

# Copy source code
COPY src/ ./src/

# Re-install with source (quick since deps are cached)
RUN uv sync --frozen --no-dev

# Default environment — can be overridden at runtime
ENV MINECRAFT_WIKI_API_URL=https://minecraft.wiki/api.php
ENV MINECRAFT_WIKI_HOST=0.0.0.0
ENV MINECRAFT_WIKI_PORT=8000

EXPOSE 8000

ENTRYPOINT ["uv", "run", "minecraft-wiki-mcp"]
CMD ["--transport", "streamable-http"]
