-- SonicAurora — the frequency catalog
--
-- Seeds `shared_documents` with the collection the library, the attunement and
-- the blends all read. The six slugs referenced by src/blends.js (174, 285,
-- 396, 528, 741, 963) must exist or those one-tap blends silently do nothing.
--
-- `intents` keys must match src/intents.js:
--   healing · clarity · divine · strength · guidance · release · sleep · love
--
-- Re-runnable: on conflict it refreshes the row rather than erroring, so this
-- doubles as the way to push catalog edits.

insert into public.shared_documents (collection, doc_id, position, data) values
('frequencies', '174', 10, jsonb_build_object(
  'slug', '174',
  'hz', 174,
  'name', 'The Foundation',
  'tagline', 'The lowest floor. Somewhere to put your weight.',
  'category', 'The Solfeggio Scale',
  'benefits', 'A low, grounding tone for nights when the body will not settle. Often chosen for physical unease and for the restlessness that keeps you turning over.',
  'intents', jsonb_build_array('healing', 'strength', 'sleep'),
  'deep', 'The first of the six original tones, and the one that asks the least of you. It sits below the range where thought usually happens — low enough that most listeners stop tracking it within a minute or two and simply feel the room get heavier. That is the intended effect. Nothing here is trying to lift you anywhere.',
  'trueSelf', 'Before anything can be repaired it has to be still. This tone is the stillness — not peace exactly, but the end of struggling against the surface you are lying on.',
  'plan', jsonb_build_array(
    'Lie down. Do not sit. This one works through the back and the legs more than the ears.',
    'Start at a volume just above the room noise, then take it down until you have to reach for it.',
    'Four hours minimum. It works cumulatively; a twenty-minute sitting tells you almost nothing.',
    'If your attention snags on it, you have it too loud.'
  ))),
('frequencies', '285', 20, jsonb_build_object(
  'slug', '285',
  'hz', 285,
  'name', 'The Return',
  'tagline', 'For what has been asked to hold too long.',
  'category', 'The Solfeggio Scale',
  'benefits', 'Associated with restoration — the sense of tissue and nerve being told to go back to how they were. A quiet, unglamorous frequency that rewards repetition.',
  'intents', jsonb_build_array('healing', 'release'),
  'deep', '285 has almost no drama to it. Listeners who arrive looking for an experience usually leave disappointed and come back later, when they want something that simply works in the background while they sleep. It is the tone most often left running all night.',
  'trueSelf', 'The body has a shape it remembers being. Most of what we call healing is just the slow argument back toward it.',
  'plan', jsonb_build_array(
    'Pair it with rain. The two hide each other well and neither pulls focus.',
    'Run it overnight for a week before deciding whether it does anything for you.',
    'Keep the volume genuinely low — this is a bed, not a signal.',
    'Note how you feel on waking, not during. That is where the difference shows.'
  ))),
('frequencies', '396', 30, jsonb_build_object(
  'slug', '396',
  'hz', 396,
  'name', 'Setting Down',
  'tagline', 'Guilt and fear are heavy. Put them on the floor.',
  'category', 'The Solfeggio Scale',
  'benefits', 'Traditionally the tone of release — chosen when something is being carried that was never yours to carry, or has been yours for too long.',
  'intents', jsonb_build_array('release', 'strength', 'guidance'),
  'deep', 'Of the six, this is the one people describe as uncomfortable at first. It sits right in the range where the voice lives, and it can feel like being spoken to. Most find that passes by the third or fourth sitting, and what is left is unusually plain — a sense of having less to hold.',
  'trueSelf', 'You are not the things you did. You are what is left when you stop defending them.',
  'plan', jsonb_build_array(
    'Before you start, write one sentence naming what you are setting down. Do not elaborate.',
    'Sit up for this one, at least the first time. It is not a sleeping tone.',
    'One hour is enough on day one. Build from there.',
    'Read your sentence again at the end. Notice whether it still sounds true.'
  ))),
('frequencies', '417', 40, jsonb_build_object(
  'slug', '417',
  'hz', 417,
  'name', 'The Turn',
  'tagline', 'Undoing the situation and starting the change.',
  'category', 'The Solfeggio Scale',
  'benefits', 'For periods that have gone stale — the same week repeating. Chosen when something needs to move and willpower has not managed it.',
  'intents', jsonb_build_array('release', 'strength', 'clarity'),
  'deep', '417 is the tone of momentum rather than arrival. It does not resolve anything. What listeners report is a loosening — the sense that a fixed situation has more give in it than it appeared to have.',
  'trueSelf', 'Nothing changes at the moment you decide. It changes at the moment the decision stops costing you anything.',
  'plan', jsonb_build_array(
    'Use it in the morning, before the day has set its shape.',
    'Two hours while you work. This one tolerates being background.',
    'Keep it to a single thing you want to move. Breadth dilutes it.',
    'Five consecutive days, then reassess.'
  ))),
('frequencies', '528', 50, jsonb_build_object(
  'slug', '528',
  'hz', 528,
  'name', 'Repair',
  'tagline', 'The one everyone arrives for.',
  'category', 'The Solfeggio Scale',
  'benefits', 'The best known of the scale — associated with repair, warmth and the kind of care you extend to yourself with difficulty. A good first frequency.',
  'intents', jsonb_build_array('healing', 'love', 'divine'),
  'deep', '528 carries more reputation than the rest of the scale combined, which cuts both ways: people expect a great deal of it and sometimes hear their expectation rather than the tone. Given a few unhurried hours it tends to settle into something warmer and less remarkable than its reputation, which is when it starts to be useful.',
  'trueSelf', 'The hardest thing most people attempt is treating themselves with ordinary decency. This is a long, patient rehearsal of it.',
  'plan', jsonb_build_array(
    'Begin here if you are beginning anywhere. It asks nothing and forgives inattention.',
    'Four hours under ocean or rain. The tide suits it particularly well.',
    'Do not chase a feeling. Let it be uneventful.',
    'Return to it between other frequencies — it works well as a home tone.'
  ))),
('frequencies', '639', 60, jsonb_build_object(
  'slug', '639',
  'hz', 639,
  'name', 'Between Us',
  'tagline', 'For the distance between people.',
  'category', 'The Solfeggio Scale',
  'benefits', 'Chosen for relationship and reconnection — with a person, a family, or a version of yourself you have not spoken to in a while.',
  'intents', jsonb_build_array('love', 'guidance', 'healing'),
  'deep', '639 is the most social of the six, and the one most often used before a difficult conversation rather than after it. It does not make anyone easier to talk to. It seems mainly to make the listener less braced.',
  'trueSelf', 'Most distance between people is maintained by two rehearsed positions. Softening one of them is usually enough.',
  'plan', jsonb_build_array(
    'Use it in the hour before you see the person, not during.',
    'Pair with piano rather than nature — the melodic bed helps here.',
    'Do not rehearse what you will say while it runs. That defeats it.',
    'Afterwards, say the smaller true thing rather than the larger one.'
  ))),
('frequencies', '741', 70, jsonb_build_object(
  'slug', '741',
  'hz', 741,
  'name', 'Clearing',
  'tagline', 'Clean air. Straight lines. Room to think.',
  'category', 'The Solfeggio Scale',
  'benefits', 'The cleansing tone — for mental fog, cluttered stretches, and the state where everything feels equally urgent.',
  'intents', jsonb_build_array('clarity', 'release', 'strength'),
  'deep', '741 sits high enough to be genuinely audible for the whole session, which makes it the least suitable for sleep and the most suitable for work. Listeners tend to use it deliberately and briefly rather than leaving it running.',
  'trueSelf', 'Clarity is not having the answer. It is the moment the question finally holds still long enough to be looked at.',
  'plan', jsonb_build_array(
    'Morning, at a desk, with forest or open air underneath.',
    'Ninety minutes. Longer and it starts to feel like pressure.',
    'One task while it runs. This frequency punishes multitasking.',
    'Stop before you are tired rather than after.'
  ))),
('frequencies', '852', 80, jsonb_build_object(
  'slug', '852',
  'hz', 852,
  'name', 'The Long View',
  'tagline', 'Coming back to what you actually know.',
  'category', 'The Solfeggio Scale',
  'benefits', 'Associated with intuition and perspective — for decisions that logic has already gone round twice without settling.',
  'intents', jsonb_build_array('guidance', 'divine', 'clarity'),
  'deep', '852 is thin and bright, and does not suit everyone. Those who take to it describe it less as insight than as subtraction: the noise around a decision drops away and what remains was apparently obvious the whole time.',
  'trueSelf', 'You usually know. The difficulty is almost never knowledge — it is that knowing commits you to something.',
  'plan', jsonb_build_array(
    'Evening, low light, no screen.',
    'Silence underneath, or a single bowl. Nothing textured.',
    'Bring one decision. Do not think about it deliberately.',
    'Write the first line that arrives afterwards, before you assess it.'
  ))),
('frequencies', '963', 90, jsonb_build_object(
  'slug', '963',
  'hz', 963,
  'name', 'The Open Channel',
  'tagline', 'Almost nothing between you and it.',
  'category', 'The Solfeggio Scale',
  'benefits', 'The highest of the scale, and the one most often chosen for prayer, contemplation and stillness rather than for any outcome at all.',
  'intents', jsonb_build_array('divine', 'guidance', 'clarity'),
  'deep', '963 is barely a sound at the volumes it is usually run at. That appears to be the point: it functions less as something to listen to than as a marker that the room has been set aside. Many listeners run it under complete silence.',
  'trueSelf', 'Listen more than you ask. Almost everything worth hearing arrives in the pause after the question.',
  'plan', jsonb_build_array(
    'Silence underneath. No nature, no music, the first several times.',
    'Very low volume. If you can hear it clearly, take it down.',
    'Twenty minutes is a full session here. It does not need hours.',
    'Ask nothing on the first day. Just keep the appointment.'
  ))),
('frequencies', '432', 100, jsonb_build_object(
  'slug', '432',
  'hz', 432,
  'name', 'Concert Pitch',
  'tagline', 'Tuned to the room rather than the orchestra.',
  'category', 'Beyond the Scale',
  'benefits', 'Not part of the Solfeggio set. An alternative tuning reference some listeners simply find easier to sit with for long stretches.',
  'intents', jsonb_build_array('healing', 'love', 'sleep'),
  'deep', '432 is a tuning standard rather than a traditional healing tone, and it is included here because a good number of listeners prefer it to everything else in the library and use it as their default bed. There is no scale position to justify — it either suits you or it does not.',
  'trueSelf', 'Not everything has to carry meaning. Some things are just easier to be near.',
  'plan', jsonb_build_array(
    'Treat it as a default rather than a practice. Leave it on.',
    'Any bed suits it. It is unusually agreeable underneath other sound.',
    'Full nights are fine. Many listeners never use anything else.',
    'Come back to the scale when you want something specific.'
  )))
on conflict (collection, doc_id) do update
  set data = excluded.data,
      position = excluded.position,
      updated_at = now();
