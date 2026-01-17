Week 3 – AI Conversation Layer (AI Calling Platform)
This week introduces AI into the system. The core orchestration, scheduler, and rules engine
MUST already be stable.
AI is strictly constrained. No free-form chatbots. No creativity. Only goal-driven conversations.
Day 1 – AI Layer Architecture
• Define AI layer as a plug-in, not core logic.
• Decide AI boundaries: input → intent → outcome.
• No direct DB writes from AI layer.
• AI can only return structured outcomes.
• Document AI responsibility clearly.
• Commit architecture doc.
Day 2 – Speech-to-Text Integration
• Integrate speech-to-text provider.
• Handle partial and final transcripts.
• Normalize transcripts into clean text.
• Handle silence and timeout cases.
• Log all transcripts.
• Commit code.
Day 3 – LLM Intent & Outcome Engine
• Define fixed intent list per bot.
• Define allowed outcomes per intent.
• Create prompt templates (no dynamic prompts).
• Force JSON-only LLM responses.
• Validate and reject invalid outputs.
• Commit code.
Day 4 – Text-to-Speech Integration
• Integrate text-to-speech provider.
• Generate speech only from approved responses.
• Ensure low-latency playback.
• Handle interruptions gracefully.
• Commit code.
Day 5 – Conversation State Machine
• Track conversation state per call.
• Map intents → responses → next state.
• Prevent infinite loops.
• Enforce max turns per call.
• Commit code.
Day 6 – AI to Rules Engine Bridge
• Translate AI outcomes to rule engine actions.
• Trigger COMPLETE, RETRY, ESCALATE events.
• Ensure AI cannot bypass stop conditions.
• Log every AI decision.
• Commit code.
Day 7 – End-to-End AI Call Test
• Run simulated inbound AI calls.
• Run outbound AI reminder calls.
• Verify outcomes match rules.
• Test failure and edge cases.
• Write Week 3 documentation.
• Final commit for Week 3.
Week 3 Rules (Must Follow)
• AI never controls scheduling directly.
• AI never writes to database.
• All AI outputs must be validated.
• Deterministic behavior over intelligence.
If Week 3 is completed correctly, AI becomes a safe worker, not a system risk