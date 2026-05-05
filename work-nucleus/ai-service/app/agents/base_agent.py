import time
import logging
from typing import Any

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import settings
from app.models.agent_log import AIAgentLog
from app.services.db import async_session

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base class for all AI agents. Provides Claude API calls with retry, logging, and tracking."""

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((anthropic.APIConnectionError, anthropic.RateLimitError)),
        reraise=True,
    )
    async def call_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        start_time = time.time()
        status = "success"
        error_message = None
        response_data = None
        tokens_input = None
        tokens_output = None

        try:
            kwargs: dict[str, Any] = {
                "model": self.model,
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
                "timeout": 30.0,
            }
            if temperature is not None:
                kwargs["temperature"] = temperature
            response = self.client.messages.create(**kwargs)

            tokens_input = response.usage.input_tokens
            tokens_output = response.usage.output_tokens
            response_data = {
                "content": response.content[0].text if response.content else "",
                "model": response.model,
                "stop_reason": response.stop_reason,
            }

            return response_data

        except Exception as e:
            status = "error"
            error_message = str(e)
            logger.error(f"[{self.agent_name}] Claude call failed: {e}")
            raise

        finally:
            latency_ms = (time.time() - start_time) * 1000

            # Log to database
            try:
                async with async_session() as session:
                    log = AIAgentLog(
                        agent_name=self.agent_name,
                        model_used=self.model,
                        input_json={
                            "system_prompt": system_prompt[:500],
                            "user_prompt": user_prompt[:500],
                        },
                        output_json=response_data,
                        tokens_input=tokens_input,
                        tokens_output=tokens_output,
                        latency_ms=latency_ms,
                        status=status,
                        error_message=error_message,
                    )
                    session.add(log)
                    await session.commit()
            except Exception as log_err:
                logger.warning(f"[{self.agent_name}] Failed to log agent call: {log_err}")
