AI Layer – Architectural Contract

Purpose
-------
The AI layer is a stateless worker responsible only for understanding
human speech or text and converting it into structured intent + outcome.

Non-Responsibilities
--------------------
The AI layer MUST NOT:
- Access the database
- Modify call records
- Control scheduling
- Control retries
- Change call state
- Store memory or conversation history
- Know organization or clinic rules

Responsibilities
----------------
The AI layer MAY:
- Receive structured context from the core system
- Convert speech/text into intent
- Select an allowed outcome from a predefined list
- Return structured JSON only

Input → Output Contract
-----------------------
Input:
- Provided by core system
- Read-only context
- No assumptions about domain data

Output:
{
  "intent": "STRING_ENUM",
  "outcome": "STRING_ENUM"
}

Invalid output MUST be ignored by the core system.

Design Principle
----------------
If the AI layer is shut down or replaced, the core system
must continue to function correctly.
