#!/usr/bin/env python3
"""Author the Garden of Arrivals rows from docs/design/fantasy-era-bible.md.

Every row here is `era: 'fantasy'`, so a Tang life cannot draw it and a
Fantasy life cannot draw a Tang-only row. The prose is checked against the
bible's own do-not list by the classifier in
src/content/progression/garden-do-not.ts, which the tests run over the
rendered rows -- not over this file, so a hand edit that slips a Tang-ism
through still fails the build.

NOTE ON THE BIBLE'S PREMISE. Section 3 says six `thing` seeds "already exist
as Fantasy variants in src/engine/manifest-catalog.ts". They do not, and never
did: `git log -S` finds no commit containing "Clay token" and the JSON5 mirror
has no such row. The bible was written against an uncommitted working state.
The seed text is in the bible, so this script authors all thirty core rows
rather than the twenty-four the bible's arithmetic implies. The six Garden-
native named figures in section 4 are NOT authored here; that is a
content-width decision reserved for the lead.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from write_guard import require_clean  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / 'src' / 'engine' / 'manifest-catalog.ts'
FIGS = ROOT / 'src' / 'engine' / 'manifest-catalog-figures.ts'


def lit(s):
    """A single-quoted TS string literal, with the usual escapes."""
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def row(name, subject, one_liner, _bible_seed, detail, tags, long_fire,
        rare, variants, era='fantasy'):
    """Render one CatalogEntry. `variants` are (detail, tags) pairs."""
    # 2 spaces for the object itself, 4 for its fields: the convention in this
    # file, and what the regex tools anchor on. Writing fields at 2 made the row
    # invisible to author-eras.py, slot-usage.test.ts and the do-not audit.
    o = '  '
    q = '    '
    t = [f'{o}{{',
         f'{q}name: {lit(name)},',
         f'{q}one_liner:',
         f'{q}  {lit(one_liner)},',
         f'{q}subject: {lit(subject)},',
         f'{q}detail:',
         f'{q}  {lit(detail)},',
         f'{q}long_fire:',
         f'{q}  {lit(long_fire)},',
         f'{q}rare:',
         f'{q}  {lit(rare)},',
         f"{q}tags: [{', '.join(lit(t2) for t2 in tags)}],",
         f"{q}era: {lit(era)},"]
    if variants:
        t.append(f'{q}templates: [')
        for v_detail, v_tags in variants:
            t += ['      {',
                  f'        detail:',
                  f'          {lit(v_detail)},',
                  f"        tags: [{', '.join(lit(t3) for t3 in v_tags)}],",
                  '      },']
        t.append(f'{q}],')
    t.append(f'{o}}},')
    return '\n'.join(t)


# ---------------------------------------------------------------- things
THINGS = [
    ('Notched pruning bill',
     'the pruner\'s own billhook',
     'A briar billhook kept sharp on a flat river stone, for green wood only.',
     'A curved billhook forged from dark river-iron and hafted in root-burl, its inner crescent honed thin from slicing wild blackthorn runners without splitting the grain.',
     'The blade is kept sharp on a flat river stone, and the edge is meant for green wood, not dry. Briar root dulls it in a season, so Dan sharpens it before the light goes.',
     ['briar', 'hook', 'cutting'],
     ' The haft has taken the sap of a hundred green runs and wears darker at the grip.',
     ' The inner crescent is thin enough to read daylight through, and still has not chipped.',
     [('You are holding the hook when the blackthorn is still running, and the sap is on your thumb before you notice the cut.',
       ['briar', 'sap', 'hook']),
      ('The crescent goes through green wood and the split runs straight along the grain, which is the only way a briar is cut at all.',
       ['briar', 'grain', 'hook'])]),
    ('Water-slate stylus',
     'the attendant\'s river-bone stylus',
     'A river-bone stylus for writing on wet slate that will not wait for you.',
     'A rounded stylus of river-bone wrapped in greasy flax thread, used by court attendants to trace fleeting recollections onto damp slate before the water evaporates and the marks dissolve.',
     'A slate is wet, and what you put on it has minutes to be said. The thread keeps the stylus from sliding and the hand from warming the stone faster than it should be dried.',
     ['slate', 'writing', 'wet'],
     ' The slate is still cool to the touch, which means the water has not finished with it yet.',
     ' Someone wrote a whole name on this stone and then let the canal take it back.',
     [('The slate is cool and already going soft at the edges, and there is not much time left to say it on.',
       ['slate', 'water', 'writing']),
      ('The flax is greasy enough to turn in your hand, and everything you mark blurs the moment you lift the stone away.',
       ['slate', 'flax', 'writing'])]),
    ('Washed fleece cushion',
     'the bench pad by the outer gate',
     'A bench pad soaked and dried until it holds warmth and gives none.',
     'A square pad of raw sheep\'s wool soaked repeatedly in the slow canal to strip its lanolin, kept on the outer stone bench so a traveler can sit through a cold watch without stiffening.',
     'Wool that still carries its oil turns cold the instant the wind finds it. This one has been soaked and dried enough times to hold warmth and give none.',
     ['wool', 'bench', 'cold'],
     ' The wool has taken the shape of everyone who has sat on it, and holds none of them now.',
     ' The canal water ran through this pad eleven times. You can count the ridges with your thumb.',
     [('You sit down on the outer bench and the cold goes out of your back in about the time it takes to count to twenty.',
       ['bench', 'cold', 'wool']),
      ('The fleece smells of slow water and nothing else, which is the point of it.',
       ['wool', 'water', 'bench'])]),
    ('Braided vow-cord',
     'the cord the vow-walkers carry',
     'Three hemp strands round one wire, notched for counting laps between the basins.',
     'A cord of three rough hemp strands twisted around a single silver wire, notched at intervals to count walking laps between the fountains and blackened with thumb-oil at the fifth knot.',
     'A promise is easier to keep if it can be counted in laps. The knots are not decoration; each one is a lap walked out and survived.',
     ['cord', 'knot', 'vow'],
     ' The fifth knot has gone black with oil, and the wire under it is warm from being worked.',
     ' Every notch on this cord has been walked twice, once going out and once coming back.',
     [('The notches are worn round and the fifth is black, and you can feel how many times it has been gripped.',
       ['knot', 'cord', 'oil']),
      ('Three strands around one wire. Pull it and all three answer at once, which is what a vow is supposed to sound like.',
       ['cord', 'knot', 'wire'])]),
    ('Storm-reed whistle',
     'the post whistle',
     'A plugged reed on a lanyard, for warning the court of the storm-edge.',
     'A short tube of hollow river-reed plugged with beeswax, kept on a lanyard at the perimeter post to warn the inner court whenever the storm-edge surges inland.',
     'It makes almost no sound, which is the design. Everyone at the post is already looking the same way, so the whistle only has to be pointed in the right direction.',
     ['whistle', 'reed', 'warning'],
     ' The wax has been reheated so often it sits flush, and the note it gives is the same one every time.',
     ' The reed is split a hairline down one side, and it still carries.',
     [('The reed gives one short note and everyone at the post is already facing outward before the sound has finished.',
       ['whistle', 'reed', 'post']),
      ('You put it to your mouth and the wax plug makes a low, closed sound that carries further than a shout would.',
       ['whistle', 'wax', 'reed'])]),
    ('Stoneware hearth-crock',
     'the crock kept warm in the ashes',
     'Bitter root kept warm in the ashes, for whoever cannot say what is wrong.',
     'A heavy, unglazed jar of coarse grey clay with a pine bung, holding bitter dried root leaves kept warm in hearth-ashes for anyone who arrives unable to speak.',
     'It is not medicine and it is not tea. It is kept at a drinkable warmth for the people who come in too shaken to say what is wrong, and it is always ready.',
     ['crock', 'root', 'warm'],
     ' The root has steeped long enough to lose its edge, and the heat is coming up through the grey clay.',
     ' Nobody in the court has ever seen this crock refilled by the person they filled it for.',
     [('You unscrew the pine bung and the bitter smell comes up out of the grey clay, and the warmth of it is the whole offer.',
       ['crock', 'root', 'warm']),
      ('It sits in the ash where a person can reach it without being asked, and it has been there all night.',
       ['crock', 'ash', 'root'])]),
]

# -------------------------------------------------------------- outcomes
OUTCOMES = [
    ('A memory smoothed clean',
     'a slate returned unmarked',
     'A slate given back to the rack with the writing taken out of it by water.',
     'A blue slate tablet returned to the wall rack without a single scratch, its crowded chalk-marks dissolved by slow water until only the dark, wet grain of the stone shows.',
     'The stone takes the writing back. Rinsed long enough, it holds nothing at all, and the next person to take it off the rack starts from the same blank grain you did.',
     ['slate', 'water', 'release'],
     ' The grain is still dark and wet where the marks were, and the rack takes it without comment.',
     ' Not one mark survived, and the attendant who washed it did not look at what was on it first.',
     [('You write, and then the canal has it, and the stone is only stone again.',
       ['slate', 'water', 'writing']),
      ('The marks go soft at the edges first and then all at once, the way a word leaves a face you are not looking at.',
       ['slate', 'water', 'release'])]),
    ('The storm hedge grafted',
     'blackthorn bound to blackthorn',
     'Two torn boughs bound wet, holding the boundary against the gale.',
     'Two torn boughs of blackthorn bound together with wet bast and river silt, holding firm against the gale where the garden\'s boundary meets the void.',
     'A hedge is a wall that grows back. The graft holds because the two halves are the same plant and the same water is running through both.',
     ['hedge', 'gale', 'repair'],
     ' The bast is wet and tightening, and the two boughs have stopped arguing with each other.',
     ' The join took in a single season, and the old scar is still visible under the new wood.',
     [('You press the two boughs together and wrap them wet, and the wind tests the join and finds nothing loose.',
       ['hedge', 'gale', 'bast']),
      ('The graft is holding where the flagstones stop, which is the only place on the boundary that has ever needed holding.',
       ['hedge', 'gale', 'stone'])]),
    ('A vow re-knotted',
     'the same cord, tied again',
     'An old pledge said aloud and pulled into a square knot in oiled cord.',
     'An old pledge carried across the crossing spoken aloud before the court attendants, recorded not with ink but by a tight square knot pulled flush into oiled flax cord.',
     'A knot is a record you can carry and check without anyone keeping it for you. Spoken in front of witnesses, tied in your own hand, it holds in a way that ink does not.',
     ['vow', 'knot', 'cord'],
     ' The square knot sits flush, and the oil makes the hemp grip the wire instead of sliding on it.',
     ' The knot is the same one you tied before the crossing, pulled again rather than retied.',
     [('You say it out loud in front of the attendants and then pull the square knot flush, and the cord takes the words.',
       ['vow', 'knot', 'cord']),
      ('The old knot will not lie flat again, so the new one is pulled beside it and the cord carries both.',
       ['vow', 'knot', 'cord'])]),
    ('Tea set for a stranger',
     'a cup on the sill, steaming',
     'A cup set steaming on the sill and emptied without a question asked.',
     'A shallow earthenware cup filled from the hearth crock and set steaming on the window-sill, emptied to the dregs without a question asked or an answer demanded.',
     'Nobody is owed an account of who they are. The cup is set down, it is drunk, and the person who set it does not come back to ask how it was.',
     ['tea', 'stranger', 'sill'],
     ' The cup is still too hot to hold, and it was set down without a word about who it was for.',
     ' The cup came back empty and rinsed, and nobody has ever asked who drank it.',
     [('The cup is set on the sill in front of you and the steam goes straight up into the cold, and nobody says anything about it.',
       ['tea', 'sill', 'stranger']),
      ('You drink it down to the dregs because that is how much of it there is.',
       ['tea', 'stranger', 'cold'])]),
    ('The low gate left unlatched',
     'the bar resting on its bracket',
     'The bar resting on its bracket all night, and three people inside.',
     'The heavy white-cane bar left resting on its bracket through the third watch, allowing three frost-blinded travelers to stumble into the porch without beating on the timber.',
     'A gate that stays barred is a wall. Left resting on the bracket through the worst of the night, it is a decision about what the court is for.',
     ['gate', 'night', 'latch'],
     ' The bar is still on the bracket, exactly where it was put, and the cold has not moved it.',
     ' Three sets of wet prints go in and none of them knocked.',
     [('The bar never came off the bracket all night, and the flagstones inside are wet with three sets of prints.',
       ['gate', 'night', 'latch']),
      ('The latch is cold under your hand and has clearly been left alone for hours.',
       ['gate', 'latch', 'night'])]),
    ('The ledger closed in green',
     'an account ruled through',
     'An old account struck through in green chalk and tied shut with reed.',
     'An account of an old family grievance ruled through with a single broad stroke of soft green chalk, then tied shut with split reed so it will not fall open again.',
     'Green chalk on a tea-dark page is soft enough to be rubbed out by anyone who feels like trying. The reed is what stops it. The cord keeps the peace, not the chalk.',
     ['ledger', 'green', 'closure'],
     ' The reed is split and tight, and the green stroke is broad enough that it will not fade to anything readable.',
     ' The stroke goes corner to corner, and the reed holding it closed is new.',
     [('One broad stroke of green across the whole account, and then split reed through the binding so it will not open again.',
       ['ledger', 'green', 'reed']),
      ('The account is tied shut and the page underneath it is a colour no one has needed in years.',
       ['ledger', 'green', 'closure'])]),
]

# --------------------------------------------------------------- changes
CHANGES = [
    ('Hands calloused to the thorn',
     'yellow horn-grain on the palms',
     'Palms gone to horn-grain, so a blackthorn shoot can be gripped without opening.',
     'The tender skin of the palms replaced by a tough, yellow horn-grain that can grip wild blackthorn shoots without flinching or drawing blood.',
     'It builds the way a callus does anywhere, except that here it is not an accident of work. The briar is the teacher and the grip is the lesson.',
     ['hands', 'thorn', 'grip'],
     ' The palms have gone the colour of the dry root, and the grip closes before you decide it should.',
     ' You can close a hand on a blackthorn shoot now and the only cost is the sap.',
     [('You take a blackthorn shoot in one hand without checking, and the grip holds and the skin does not open.',
       ['hands', 'thorn', 'grip']),
      ('The horn-grain on the palms is thick enough that the sap has to be wiped off rather than washed out.',
       ['hands', 'sap', 'thorn'])]),
    ('Pace matched to the water',
     'a step that waits for the ripple',
     'A hurried stride slowed until the heel falls with the ripple.',
     'A hurried, scrambling city stride slowed step-by-step until the heel strikes the flags only when the ripple from the sluice touches the canal margin.',
     'It is not calm you have learned. It is a rhythm taken from something that was already moving slowly and had been moving slowly for a long time.',
     ['pace', 'water', 'ripple'],
     ' The heel comes down with the ripple now, and the two have not disagreed all morning.',
     ' The stride has slowed so far that the canal has become the clock.',
     [('You walk the flags and your heel comes down exactly when the ripple reaches the margin, and you did not decide that.',
       ['pace', 'water', 'ripple']),
      ('The scramble is gone out of your walk, and what is left takes its time and does not hurry you.',
       ['pace', 'water', 'walk'])]),
    ('An ear for the single bell',
     'listening inside the hum',
     'Street-startled ears turned to the three-minute hum inside one note.',
     'The jumpy alertness of crowded market streets replaced by a quiet attention that rests inside the long, three-minute reverberation of the bronze bowl after the mallet lifts.',
     'Three minutes is long enough to hear a second thing inside the first one. The street never gave you that, because the street never stopped.',
     ['bell', 'listening', 'hum'],
     ' The three minutes are still running in the bowl, and you can hear the part of it you would have missed before.',
     ' The hum has a node in it, and the node is where you can hear your own breathing.',
     [('The mallet lifts and the bowl goes on for three minutes, and you sit inside the sound instead of waiting for it to stop.',
       ['bell', 'hum', 'listening']),
      ('Somewhere under the reverberation there is a place where the note turns over, and that is where you are listening from.',
       ['bell', 'hum', 'note'])]),
    ('Release of the ancestral roll',
     'both hands empty and free',
     'The habit of searching the roll for names, set down and not taken up.',
     'The nervous habit of searching court records for family names set aside, leaving both hands empty and free to carry bread out to the threshold benches.',
     'The roll was never going to say anything it had not already said. The hands, once they stop checking, turn out to be good for carrying things to people.',
     ['roll', 'records', 'hands'],
     ' The hands are empty, and the emptiness is not a lack. It is just hands.',
     ' The roll has not been opened in a long time, and the bread is out on the bench.',
     [('You reach for the roll out of habit and then do not, and the bread goes out to the benches instead.',
       ['roll', 'hands', 'bread']),
      ('Both hands are free and carrying something, which is a better use of them than turning pages.',
       ['hands', 'roll', 'bread'])]),
    ('Tolerance for cold limestone',
     'a heavy stillness on the stone',
     "A body that will sit still on cold stone through another person's grief.",
     'The body\'s instinct to shudder against damp stone giving way to a grounded, heavy stillness that can sit through another soul\'s hours of silent grief.',
     'Cold stone is not the problem. The problem is staying on it while someone else is in trouble, and a body that will not stop shivering cannot do that.',
     ['stone', 'stillness', 'grief'],
     ' The damp has stopped being cold, and the weight is doing the work the shivering was doing.',
     ' You sat through a whole watch on that stone and your back never once complained.',
     [('You sit on the cold flags and the shudder never comes, and the weight of you is simply there.',
       ['stone', 'stillness', 'cold']),
      ('Somebody else has been in grief for hours and you have stayed on the stone the whole time.',
       ['stone', 'grief', 'stillness'])]),
    ('Breath steadied at the boundary',
     'a measured rhythm behind the ribs',
     'The panic at the ditch edge settling into a counted rhythm.',
     'The sudden panic that rises when looking into the chaotic void beyond the ditch settling into a low, measured rhythm behind the ribs.',
     'The void does not change. What changes is the count behind the ribs, and past a certain number of counts the looking becomes survivable.',
     ['breath', 'boundary', 'void'],
     ' The breath has found its count, and the void is still exactly as loud as it was.',
     ' The rhythm is low enough now that you can hold it across the whole width of the ditch.',
     [('You look into the void and the breath behind the ribs keeps its own count and does not follow the noise.',
       ['breath', 'void', 'boundary']),
      ('The panic comes up to the edge of the ditch and stops there, because you have counted past it.',
       ['breath', 'boundary', 'void'])]),
]

# ---------------------------------------------------------------- places
PLACES = [
    ('The Twin Fountains terrace',
     'flagstones between two low basins',
     'Two low basins and the straight worn line of flags walked between them.',
     'A broad expanse of weathered flagstones laid between two low circular limestone basins, where travelers pace the straight line between them until their vows stop racing.',
     'Two basins, one line, and as many laps as it takes. Nobody counts for you and nobody will tell you when to stop.',
     ['fountains', 'flags', 'pacing'],
     ' The flags between the basins are worn pale in a straight line, and your feet know the length of it by now.',
     ' The water in the southern basin is high enough to break over the lip in a wind.',
     [('You walk the straight line between the two basins and the paving under you is worn to a pale stripe.',
       ['fountains', 'flags', 'pacing']),
      ('Neither basin is doing anything. You walk between them anyway, because the walking is the part that helps.',
       ['fountains', 'pacing', 'water'])]),
    ('The Low Gate threshold',
     'a grey lintel and a cane wicket',
     'A grey lintel and a cane wicket where arriving travelers are looked at.',
     'An unadorned lintel of rough grey river stone hung with a wicket of woven cane, where every arriving traveler pauses in travel-stained cloth to meet the Gardener\'s eyes.',
     'Nobody is let past the threshold without being looked at. Not for papers, not for a name, just so that whoever is on the other side is a person and not a rumour.',
     ['gate', 'threshold', 'wicket'],
     ' The grey lintel is cold and the cane wicket is not, and the difference is the whole point of the gate.',
     ' The wicket is newer than the stone around it, and the stone is much older than anything else here.',
     [('The cane wicket gives under your hand and you stop, and the eyes on the other side of the stone are waiting.',
       ['gate', 'threshold', 'wicket']),
      ('You stand on the flags in your travel clothes and nobody asks you for anything at all.',
       ['gate', 'threshold', 'watches'])]),
    ('The Hall of Rolls',
     'a pavilion of pale posts and slate',
     'An open pavilion where everything anyone came here about is read aloud.',
     'An open-sided pavilion of salt-bleached cedar posts roofed with slate, where court attendants sit at long scrubbed trestles unrolling lengths of thumbed mulberry paper.',
     'Everything anyone has ever come here to be reminded of is unrolled on these tables, in order, and read out in a voice with no opinion in it.',
     ['rolls', 'cedar', 'paper'],
     ' The mulberry goes brittle where the thumbs have worked the edge, and the whole length of it is soft where it is handled.',
     ' A roll long enough to need two trestles has been read to the end without anyone being named in it.',
     [('The unrolling goes on and on down the trestle, and the voice reading it has no rise or fall in it at all.',
       ['rolls', 'paper', 'reading']),
      ('Mulberry under a slate roof, and the paper has gone the colour of weak tea along every handled edge.',
       ['rolls', 'cedar', 'paper'])]),
    ('The Storm Edge ditch',
     'a wide ditch of gravel and briar',
     'A wide gravel ditch where the laid flagstones end and the unfinished ground begins.',
     'A wide, sunken ditch of loose river gravel and dense briar that marks the outer boundary where the paved flagstones end and the unformed tempest begins.',
     'The last ground that is laid. Everything past the gravel lip is not hostile, it is simply not finished, and the briar is what holds the two apart.',
     ['ditch', 'briar', 'boundary'],
     ' The gravel has shifted in the night and taken a new bite out of the edge of the flags.',
     ' The briar has grown across the ditch mouth in places, and nobody cuts it back.',
     [('The gravel gives under your boots and then the flags stop, and the wind coming off it has nothing in it to hold.',
       ['ditch', 'briar', 'boundary']),
      ('You can stand on the last laid stone and look at the place where the ground stops being ground.',
       ['ditch', 'boundary', 'stones'])]),
    ('The Bell Pavilion',
     'four posts and a low-hung bell',
     'A low-hung bronze bell in four cedar posts, close enough to feel it arrive.',
     'A four-pillar cedar cupola sheltering the Bell That Rings Once, hung from cured rawhide so low that a seated listener\'s forehead rests level with its rim.',
     'It hangs low on purpose. You are meant to be close enough to feel it arrive before you hear it, and close enough that the hum does not have far to go.',
     ['bell', 'cedar', 'hide'],
     ' The rawhide takes up the note instead of throwing it back, and the three minutes stay inside the pavilion.',
     ' The rim is worn smooth at the one place where a forehead rests.',
     [('The bell is hung so low that a seated head is level with the rim, and the hum does not go anywhere.',
       ['bell', 'hide', 'listening']),
      ('The mallet comes up off the rawhide and the sound stays in the four posts with you.',
       ['bell', 'cedar', 'note'])]),
    ('The Slow Water reach',
     'a straight canal of flat blue stone',
     'A straight canal so slow a fallen leaf takes half a morning to cross it.',
     'A shallow, straight canal walled with flat blue stones, whose current moves so imperceptibly that fallen willow leaves take half a morning to drift from the sluice to the lower weir.',
     'Nothing about it is fast. A thing put in at the sluice is still arriving at the weir at noon, and you can watch the whole journey if you have half a morning and nothing else to do.',
     ['canal', 'weir', 'leaves'],
     ' The leaves are halfway down the reach, which means they were released before you thought to look.',
     ' A willow leaf has made the full length of the canal and arrived without being hurried once.',
     [('A leaf goes past the sluice and you watch it most of the way to the weir before your attention gives out.',
       ['canal', 'leaves', 'weir']),
      ('The water is not moving as far as you can see, and the leaf on it is not moving either, and both are wrong.',
       ['canal', 'water', 'weir'])]),
]

# ---------------------------------------------------------------- people
PEOPLE = [
    ('An, the gate listener',
     'the one who sits on the mounting stone',
     'On the mounting stone, tipping their chin toward the latch before you arrive.',
     'Sits on the low mounting stone with knees pulled up to the chest; tilts their chin toward the latch when footsteps approach; hands you a dry scrap of woolen cloth to wipe threshold mud from your face.',
     'An has been on that stone long enough that the stone has taken the shape of them. They do not stand to be told anything, and they do not need to.',
     ['gate', 'listener', 'stone'],
     ' The stone under An has a hollow worn into it, and the woolen scrap is dry and smells of nothing.',
     ' An has counted more arrivals than the court has records, and says so without pride.',
     [('An tips their chin toward the latch before your boots finish on the flags, and the woolen cloth is already in their hand.',
       ['gate', 'latch', 'wool']),
      ('The mounting stone is worn into a shape, and An sits in it the way water sits in a hollow.',
       ['gate', 'stone', 'listener'])]),
    ('Dan, the hedge pruner',
     'the one with sap on the apron',
     'Wiping sap from the hook and pointing out briar in the paving.',
     'Constantly wipes green sap from the hook of a pruning bill onto a stiff leather apron; points out where wild briars have rooted into flagstone cracks so the footing can be cleared.',
     'Dan has been cutting the same hedge long enough to know where it will next reach, and says so before it does.',
     ['hedge', 'sap', 'briar'],
     ' The leather apron is stiff with a season of sap and the hook is wiped on it between every cut.',
     ' Dan knows the briar by its root, and can name where it will be next year.',
     [('The sap comes off the hook onto the stiff leather and Dan points at a flagstone with a green root lifted out of it.',
       ['hedge', 'sap', 'briar']),
      ('A crack in the paving, a root in it, and a hook that has already been through there twice today.',
       ['hedge', 'briar', 'stone'])]),
    ('Sula, the roll attendant',
     'the one who reads without looking up',
     'Unrolling mulberry and reading your habits back in a flat, calm voice.',
     'Unrolls narrow strips of mulberry paper with steady thumbs without looking up; reads your recorded habits aloud in a neutral, calm voice that strips them of pride and guilt.',
     'Sula reads what is written and nothing else. Whatever the paper says, the voice says it the same way it says the weather.',
     ['roll', 'paper', 'voice'],
     ' The thumbs never hurry on the paper, and the voice does not change for what it finds.',
     ' A whole roll of it, read in one voice, with nothing at all left out and nothing added.',
     [('The strip unrolls under steady thumbs and the voice reads your own habits back to you without a single shade of anything.',
       ['roll', 'paper', 'voice']),
      ('Sula does not look up, and the reading goes on in exactly the same tone it started in.',
       ['roll', 'voice', 'paper'])]),
    ('Mire, the water tender',
     'the one with the wicker scoop',
     'Skimming the slow reach and watching the current at the sluice.',
     'Skims duckweed and fallen twigs from the slow canal using a split-wicker scoop; warns you when the current has begun to back up against the stone sluice.',
     'The reach is Mire\'s whole responsibility and the only thing that ever goes wrong with it is the current changing its mind.',
     ['canal', 'scoop', 'duckweed'],
     ' The duckweed comes up green on the wicker and the water behind it is going the wrong way.',
     ' The current has backed up to the sluice and Mire has been watching it for an hour.',
     [('The wicker scoop comes up green and Mire says the current is backing, and the water behind the sluice agrees.',
       ['canal', 'scoop', 'water']),
      ('Duckweed and twigs, lifted off the reach one at a time, all day, and the water is left clear.',
       ['canal', 'scoop', 'duckweed'])]),
    ('Kith, the vow walker',
     'the one counting laps on the cord',
     'Walking the fountain line, working the notched cord, matching your stride.',
     'Walks with eyes fixed three paces ahead, right thumb working a notched hemp cord at the sash; matches strides with you for three laps between the fountains until your breathing falls into cadence.',
     'Kith does not talk while walking and does not slow down to be caught. The cord is the only thing in the whole court that is not patient.',
     ['vow', 'walk', 'cord'],
     ' The cord is worked the whole way round the line, and the notches are counting laps you would not have counted.',
     ' Three laps, in step, and the breathing has gone quiet enough to hear the bells over.',
     [('Kith walks the line with a thumb on the notched cord and matches you stride for stride without ever looking over.',
       ['vow', 'walk', 'cord']),
      ('Three paces ahead there is only the next flagstone, and your breathing has taken the pace of someone else\'s.',
       ['vow', 'walk', 'pace'])]),
    ('Renn, the tea keeper',
     'the one over the charcoal',
     'Blowing on the embers and setting down a cup without asking who you are.',
     'Blows gently on charcoal embers beneath a battered iron kettle; slides a cracked earthenware cup of steaming root-tea across the hearth stones without asking who you were.',
     'Renn has never once asked. The cup is set, and the question is whether you will drink it, and that is the only part that concerns anyone.',
     ['tea', 'hearth', 'cup'],
     ' The cracked cup is warm through and the kettle is only just off the embers.',
     ' The cup is set down without a question and nobody comes back to ask about it.',
     [('The cracked cup comes across the hearth stones and the steam goes up in front of your face and no question comes with it.',
       ['tea', 'hearth', 'cup']),
      ('Renn blows once on the embers and the kettle answers, and the cup does not wait for a name.',
       ['tea', 'hearth', 'kettle'])]),
    ('Oris, the storm watcher',
     'the one shading their eyes at the post',
     'At the last post, shading their eyes against the glare off the void.',
     'Leans against the bleached pine watch-post with one forearm shading their eyes against the glare of the void; signals when a squall threatens to tear through the outer wicker screens.',
     'The post is the furthest laid ground, and the reason it is laid at all is that somebody has to stand on it and look outward all day.',
     ['storm', 'post', 'watch'],
     ' The bleached post has the glare coming off it, and the squall behind the screens is not being held by much.',
     ' Oris has watched the void long enough to read it the way you read a face.',
     [('A forearm across the eyes against the glare, and a nod toward the screens where the wicker is starting to move.',
       ['storm', 'post', 'void']),
      ('The watch-post is the last ground with a roof on it, and Oris is still looking past all of it.',
       ['storm', 'post', 'watch'])]),
    ('Vanya, the slate scourer',
     'the one with the horsehair brush',
     'Scrubbing slates in lime-water and setting out a clean dripping stone.',
     'Rinses slate memory tablets in a cedar tub of lime-water with a stiff horsehair brush; sets out a clean, dripping stone on the bench for you to write upon.',
     'The brush is stiff enough to be unpleasant and the water is lime, and both are because a soft brush on wet slate leaves marks nobody wanted.',
     ['slate', 'lime', 'brush'],
     ' The lime-water is still cloudy from the last stone, and the set-out tablet is dripping on the bench.',
     ' A stone scrubbed this hard gives back a grain so clean you can see the light through it.',
     [('The horsehair brush goes hard across the wet slate and the lime-water clouds, and a clean stone comes out dripping on the bench.',
       ['slate', 'lime', 'brush']),
      ('Every tablet in the tub is losing something it was given, on purpose, and the water is doing the work.',
       ['slate', 'lime', 'water'])]),
    ('Cor, the bell striker',
     'the one standing by the cedar pillar',
     'Still at the cedar pillar, mallet held in, giving the nod before the one note.',
     'Stands motionless beside the cedar pillar with a cloth-wrapped mallet held against their breastbone; gives you a brief nod just before striking the single noon note.',
     'The nod is the only warning you get, and it is a warning. Then the mallet goes up and the note goes on for three minutes and everyone in the court has to get through it.',
     ['bell', 'mallet', 'noon'],
     ' The cloth-wrapped mallet is up against the breastbone and the whole pavilion is waiting on the nod.',
     ' Cor strikes it once a day and does not strike it twice, whatever the morning has been like.',
     [('A nod, and then the mallet is up, and the single note goes out through the four posts and stays.',
       ['bell', 'mallet', 'noon']),
      ('Cor stands perfectly still with the mallet held in, and the strike is the only fast thing that happens all day.',
       ['bell', 'noon', 'post'])]),
    ('Jael, the threshold attendant',
     'the one folding the wet cloaks',
     'Kneeling on the damp flags, folding wet cloaks, filling the flue pegs.',
     'Kneels on the damp flags folding discarded wet cloaks into tight bundles; takes your drenched outer wrap and hangs it on the drying pegs by the flue.',
     'The pegs by the flue hold more than the pegs were cut for. Jael keeps them full and does not mention it, and the warmth gets into the cloth before it goes back.',
     ['threshold', 'cloak', 'pegs'],
     ' The bundle is tight and the pegs by the flue are full, and your wrap is steaming where the heat is getting into it.',
     ' Jael has dried more wet cloaks than the court has beds, and the pegs were not built for it.',
     [('The outer wrap goes up on a peg by the flue and the heat is already working on the cloth.',
       ['threshold', 'cloak', 'pegs']),
      ('Jael is kneeling on the damp flags folding wet cloaks tight, and does not stop to ask whose they are.',
       ['threshold', 'cloak', 'flags'])]),
    ('Maren, the seed gatherer',
     'the one with the thorned fingers',
     'Shaking blackthorn into a split basket, hands scratched to a pattern.',
     'Shakes ripe blackthorn berries into a split-willow basket with thorn-scratched fingers; hands you a scoop of hard black seeds to press into gaps along the northern hedge.',
     'The seeds go into the gaps and the hedge comes up through them, which means the hedge decides where it goes and Maren only persuades it.',
     ['seed', 'basket', 'hedge'],
     ' The black seeds are hard and dry, and the gaps along the northern hedge are waiting for them.',
     ' Maren has planted enough blackthorn to close the whole storm line, one thorned hand at a time.',
     [('A scoop of hard black seeds pressed into the gap, and Maren\'s own hands are scratched in a pattern you can read.',
       ['seed', 'hedge', 'basket']),
      ('The berries go into the split willow and the hedge along the north is not finished yet.',
       ['seed', 'basket', 'hedge'])]),
    ('Thess, the cane joiner',
     'the one with the thumb-knife',
     'Trimming white cane and fitting a polished jade pin in place of a cracked one.',
     'Trims strips of white river cane with a flat thumb-knife; replaces a cracked hinge pin on your rule with a polished peg of green river-jade.',
     'Cane is cut to a slant and tested by flex, never by eye. The jade pin is not an ornament; it will outlast the rule it is fitted to.',
     ['cane', 'jade', 'hinge'],
     ' The green jade pin is polished and set dead true, and the cracked one is on the bench in two pieces.',
     ' Thess has fitted jade to a rule that will outlast the both of them, and did not charge for the pin.',
     [('The cracked hinge comes out and a polished green pin goes in, and the rule closes like it never had a crack.',
       ['cane', 'jade', 'hinge']),
      ('White river cane trimmed on the slant, flexed by thumb, and set with a peg that will still be smooth in twenty years.',
       ['cane', 'jade', 'knife'])]),
]

# ---------------------------------------------------------------- figures
# The twelve existing figure rows, in Garden vernacular. Era-scoped, so they
# only appear in a Fantasy life. The bible's own examples: Avalokitesvara as a
# water-soaked attendant on cold flags, Amitabha as the warmth in the amber
# mist or the mason of the fountains, Ksitigarbha with an iron-shod staff in
# the root cellar. Manual threshold labor, no gold leaf, no sermon.
FIGURES = {
    'Śākyamuni': (
        'The one who stops at the low gate',
        ['gate', 'step', 'threshold'],
        'He sits on the cold flags at the low gate and does not get up when anyone comes in, and the people at the gate stop talking while he is sitting there. The wicket swings behind him and nobody shuts it.',
        ' He is not going to ask you for anything, and the gate is not going to close while he is there.',
        ' He has been at that gate since before the lintel was cut, and the stone has worn where he sits.',
        'The one who stopped in the lane'),
    'Amitābha': (
        'The warmth in the amber mist',
        ['mist', 'fountain', 'amber'],
        'At dusk the mist over the twin fountains turns the colour of old honey, and anyone walking between the basins is warmer at the far end than at the near one. Nobody has measured it and everybody has noticed.',
        ' The amber is thicker than it was, and the far basin is running warm enough to fog a window.',
        ' He set the distance between the two basins himself, counting paces, so that a heart in a hurry could find its pace and stop.',
        'The warmth at the far basin'),
    'Bhaiṣajyaguru, the Medicine Buddha': (
        'The one who keeps the crock warm',
        ['crock', 'root', 'hearth'],
        'He keeps the grey clay crock of bitter root in the hearth ashes, and the cork is loosened before anyone asks for it. The root is not medicine. It is for the people who come in unable to say what is wrong.',
        ' The ash has held it warm since before the first arrivals, and the cup is out before the knocking stops.',
        ' He has never once asked what a thing was for, and the crock is full anyway.',
        'The crock that is always warm'),
    'Vairocana': (
        'The one who reads the light wrong',
        ['light', 'rolls', 'hall'],
        'He sits where the slate roof of the Hall of Rolls throws its light across the trestles, and reading a roll out of that light is an effort. He reads them anyway, at the pace the paper wants, not the pace the court wants.',
        ' The light off the slate moves across the trestles all morning, and he is still in the middle of the roll.',
        ' There is no shadow on him at all in that hall, and the attendants stopped remarking on it a long time ago.',
        'The light with no shadow'),
    'Maitreya': (
        'The bench that is already made',
        ['bench', 'wait', 'threshold'],
        'The outer bench has a folded fleece cushion on it, and it is folded the same way every morning, and nobody is on it. People wait there anyway, because a seat that is always ready is easier to sit on than a person who might say no.',
        ' The cushion has been soaked and dried enough times to give no cold, and it is folded the same way it always is.',
        ' The bench has never once been occupied, and it has been sat on every day since the court was laid out.',
        'The seat that is already made'),
    'Avalokiteśvara (Guanyin)': (
        'The attendant on the cold flags',
        ['flags', 'tears', 'attendant'],
        'They sit on the cold flagstones beside whoever is coming apart, in coarse wet linen, and they do not recite anything. There is tea, and there is a steady hand on the shoulder, and that is the entire method.',
        ' The linen is soaked through and they have not moved, and the tea they brought is still warm.',
        ' They have never once told anybody what was wrong with them, and they have never needed to be asked either.',
        'The one who sits with you on the flags'),
    'Mañjuśrī (Wenshu)': (
        'The two words at the gate',
        ['words', 'gate', 'cord'],
        'He meets people at the low gate and gives them two words, and the two words are the right ones. He has been doing it long enough that newcomers ask for him by name, and he still takes exactly as long as it takes.',
        ' The two words are short and they land, and the person at the gate is already walking differently.',
        ' He gave the same two words to three people in a row last week and each of them needed those two words.',
        'The two words and nothing else'),
    'Samantabhadra (Puxian)': (
        'The one holding the embankment true',
        ['embankment', 'post', 'bast'],
        'There is a post on the outer embankment that has to be held down, and he holds it. Nothing dramatic happens there. The storm comes and the post stays where it is, and the ditch does not move in.',
        ' The post is holding and the bast has not gone, and the ditch is where it was laid.',
        ' He has stood in that exact spot through gales that took the wicker screens and left the post untouched.',
        'The post that did not move'),
    'Kṣitigarbha (Dizang)': (
        'The one in the root cellar',
        ['cellar', 'ditch', 'staff'],
        'He is down in the root cellars or wading in the thorny muck of the storm ditch, hauling out people who went in before they reached the gate. The staff he leans on is iron-shod, and it is not for walking.',
        ' The staff is iron-shod and it is leaning, and he has been in the cold water longer than you have.',
        ' He pulled four people out of the ditch in one night and the fifth was not alive to be pulled out.',
        'The one who goes into the water'),
    'Mahāsthāmaprāpta (Dashizhi)': (
        'The one pace past the gate',
        ['bridge', 'wait', 'crossing'],
        'He does not stop at the far bank, he stands one pace past it, which is close enough to be the last person you see from this side and far enough that he is not one of yours. That is the entire job and he has never once left it.',
        ' He is a pace past the bank and he is not moving, and he has been not moving for some time.',
        ' He has walked to the far bank a thousand times and has never once come back over it.',
        'The pace past the bank'),
    'Nāgārjuna': (
        'The rafters of the low hall',
        ['rafter', 'hail', 'repair'],
        'He works on the low hall when it needs it. Two rafters came down in a gale and he and four others went up onto the wet beams and put them back, and he talks about it the way you talk about a fence post.',
        ' The rafters are up and he is on the ground again, and the hall is being used as though nothing happened to it.',
        ' He set two of the beams himself and would not say which, and nobody asked a second time.',
        'The one who went up onto the wet beams'),
    'Bodhidharma': (
        'The man under the lee wall',
        ['wall', 'firewood', 'lee'],
        'He sits under the lee wall with his back to the wind, and the first thing he says to anyone who finds him is whether they have brought firewood. There is no gate for him and he does not go through it.',
        ' The lee wall is warm on the inside from the sun and he is on the cold side of it, and he has firewood.',
        ' He has not been on the other side of the wall in a long time, and the court has stopped remarking on it.',
        'The one who asks about the firewood'),
}

PER_ARRAY = [
    ('const THINGS: readonly CatalogEntry[] = [', 'GARDEN_THINGS', THINGS),
    ('const OUTCOMES: readonly CatalogEntry[] = [', 'GARDEN_OUTCOMES', OUTCOMES),
    ('const CHANGES: readonly CatalogEntry[] = [', 'GARDEN_CHANGES', CHANGES),
    ('const PLACES: readonly CatalogEntry[] = [', 'GARDEN_PLACES', PLACES),
]


def append_to_array(src, marker, name, rows):
    """Append rows to the array introduced by `marker`, before its `];`."""
    if f'const {name}' in src:
        print(f'  skip (already authored): {name}')
        return src, 0
    at = src.index(marker)
    close = src.index('\n];', at)
    block = '\n'.join(row(*r) for r in rows)
    return src[:close] + '\n' + block + src[close:], len(rows)


def main():
    src = CORE.read_text()
    total = 0
    for marker, name, rows in PER_ARRAY:
        src, n = append_to_array(src, marker, name, rows)
        total += n
        print(f'  {name}: {n} rows')

    # Register the new arrays. Appending rows to a module-level array and not
    # wiring it into CATALOG is the quietest way to author nothing at all: the
    # file grows, the tests pass, and no card can ever draw the row.
    if 'GARDEN_THINGS' in src and 'GARDEN_THINGS,' not in src:
        src = src.replace('  thing: THINGS,',
                          '  thing: [...THINGS, ...GARDEN_THINGS],')
        src = src.replace('  outcome: OUTCOMES,',
                          '  outcome: [...OUTCOMES, ...GARDEN_OUTCOMES],')
        src = src.replace('  change: CHANGES,',
                          '  change: [...CHANGES, ...GARDEN_CHANGES],')
        src = src.replace('  place: [...PLACES, ...FIGURE_PLACES],',
                          '  place: [...PLACES, ...GARDEN_PLACES, ...FIGURE_PLACES],')
        src = src.replace('  person: [...PEOPLE, ...FIGURE_PEOPLE],',
                          '  person: [...PEOPLE, ...GARDEN_PEOPLE, ...FIGURE_PEOPLE],')
        print('  registered 5 garden arrays in CATALOG')

    # The people rows live in a separate array inside the same file.
    src, n = append_to_array(
        src, 'const PEOPLE: readonly CatalogEntry[] = [', 'GARDEN_PEOPLE', PEOPLE,
    )
    total += n
    print(f'  GARDEN_PEOPLE: {n} rows')
    print(f'manifest-catalog.ts: {total} garden rows')

    # Figure rows gain one Garden-vernacular, era-scoped template each.
    fsrc = FIGS.read_text()
    fn = 0
    for name, (title, tags, detail, long_fire, rare, *_) in FIGURES.items():
        marker = f"name: '{name}',"
        at = fsrc.index(marker)
        row_open = fsrc.rindex('{', 0, at)
        row_close = fsrc.index('\n  },', row_open)
        body = fsrc[row_open:row_close]
        if f"'{title}'," in body:
            continue
        tpl = (
            "\n      {\n"
            "        name:\n"
            f"          {lit(title)},\n"
            f"        detail:\n"
            f"          {lit(detail)},\n"
            f"        long_fire:\n"
            f"          {lit(long_fire)},\n"
            f"        rare:\n"
            f"          {lit(rare)},\n"
            f"        tags: [{', '.join(lit(t) for t in tags)}],\n"
            "        era: 'fantasy',\n"
            "      },"
        )
        anchor = '    templates: ['
        ai = fsrc.index(anchor, row_open) + len(anchor)
        fsrc = fsrc[:ai] + tpl + fsrc[ai:]
        fn += 1
    print(f'manifest-catalog-figures.ts: {fn} garden-vernacular figure templates')
    # Guard BEFORE writing, and only if there is something to write: a
    # no-op re-run must not refuse just because the tree is dirty.
    if total or fn:
        require_clean([CORE, FIGS], 'the Garden of Arrivals rows')
        CORE.write_text(src)
        FIGS.write_text(fsrc)
        print(f'  wrote {CORE.name} and {FIGS.name}')


if __name__ == '__main__':
    main()
