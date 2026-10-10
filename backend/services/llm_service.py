"""Centralized Groq client and text-generation helpers."""

import os
from functools import lru_cache

from groq import Groq

from backend.config import DEFAULT_GROQ_MODEL, settings


DEFAULT_MODEL = DEFAULT_GROQ_MODEL
DEFAULT_TEMPERATURE = 0.2
DEFAULT_MAX_TOKENS = 1200

CONFIGURED_MODEL = settings.groq_model


class LLMServiceError(RuntimeError):
    """Raised when the Groq service cannot complete a request."""


def _safe_error_message(error: Exception) -> str:
    """Return an actionable error message without including request details."""
    error_name = type(error).__name__
    messages = {
        "AuthenticationError": "Groq authentication failed. Check GROQ_API_KEY.",
        "PermissionDeniedError": "Groq denied access to the configured model.",
        "NotFoundError": "The configured Groq model was not found.",
        "RateLimitError": "Groq rate limit reached. Please try again shortly.",
        "APIConnectionError": "Could not connect to Groq. Check the network connection.",
        "APITimeoutError": "The Groq request timed out. Please try again.",
    }
    return messages.get(error_name, "Groq request failed. Please try again.")


@lru_cache(maxsize=1)
def get_client() -> Groq:
    """Return the application's reusable Groq client."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not api_key.strip():
        raise LLMServiceError(
            "GROQ_API_KEY is missing. Add it to the project .env file."
        )

    return Groq(api_key=api_key)


def generate_response(
    user_prompt: str,
    system_prompt: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> str:
    """Generate and return text from the configured Groq chat model."""
    if not isinstance(user_prompt, str) or not user_prompt.strip():
        raise ValueError("user_prompt must be a non-empty string.")
    if system_prompt is not None and not isinstance(system_prompt, str):
        raise TypeError("system_prompt must be a string or None.")
    if not 0 <= temperature <= 2:
        raise ValueError("temperature must be between 0 and 2.")
    if not isinstance(max_tokens, int) or isinstance(max_tokens, bool) or max_tokens <= 0:
        raise ValueError("max_tokens must be a positive integer.")

    messages: list[dict[str, str]] = []
    if system_prompt and system_prompt.strip():
        messages.append({"role": "system", "content": system_prompt.strip()})
    messages.append({"role": "user", "content": user_prompt.strip()})

    try:
        completion = get_client().chat.completions.create(
            model=CONFIGURED_MODEL,
            messages=messages,
            temperature=temperature,
            max_completion_tokens=max_tokens,
        )
        content = completion.choices[0].message.content
        if not content or not content.strip():
            raise LLMServiceError("Groq returned an empty response.")
        return content.strip()
    except LLMServiceError:
        raise
    except Exception as error:
        raise LLMServiceError(_safe_error_message(error)) from error


def check_connection() -> tuple[bool, str]:
    """Perform a minimal request to verify Groq connectivity."""
    try:
        generate_response(
            "Respond with exactly: OK",
            system_prompt="Return only the requested text.",
            temperature=0,
            max_tokens=64,
        )
        return True, "Connected"
    except (LLMServiceError, ValueError, TypeError) as error:
        return False, str(error)
