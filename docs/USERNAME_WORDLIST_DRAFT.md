# Reviewed student username word lists

Approved for the prototype after the school review. New usernames use `adjective-animal`,
for example `marvellous-goat`, `funky-chicken` or `cosmic-otter`. Any adjective
can pair with any animal. UK spellings are used.

There are **128 adjectives × 128 animals = 16,384 distinct combinations**: over
16 times the expected maximum of 1,000 users. After 1,000 assigned names, 15,384
combinations would remain if none were reused. Expanding either list can add
capacity without renaming existing accounts.

The generator selects another pair when Auth reports a name is already taken.
Auth also prevents concurrent requests from assigning the same identity.
Random draws alone do not guarantee uniqueness.
Usernames remain identifiers; passwords provide sign-in protection.

These are the reviewed lists, with blooming, cherry and furry replaced by brave,
crisp and silky. All words use lowercase ASCII letters and have no spaces or
hyphens within a word. Further school review can still remove unwanted pairings.

| Adjectives | Animal nouns |
| --- | --- |
| adventurous, airy, amber, amusing | aardvark, alpaca, antelope, armadillo |
| animated, apricot, aqua, artistic | axolotl, badger, bat, bear |
| azure, beaming, blissful, blue | bison, bobcat, buffalo, butterfly |
| bold, bouncy, brave, breezy | camel, capybara, chameleon, cheetah |
| bright, brisk, bubbly, calm | chicken, chipmunk, crab, crocodile |
| carefree, cheerful, chestnut, chirpy | deer, dolphin, dragonfly, duck |
| cinnamon, citrus, coastal, colourful | eagle, elephant, elk, emu |
| coral, cosmic, cosy, crisp | falcon, ferret, finch, firefly |
| curious, dancing, dapper, dazzling | flamingo, fox, frog, gazelle |
| dewy, dreamy, eager, electric | gecko, gerbil, gibbon, giraffe |
| emerald, enchanted, energetic, evergreen | goat, goldfinch, goldfish, gorilla |
| fabulous, fancy, fearless, festive | hamster, hare, hawk, hedgehog |
| fiery, fizzy, fluffy, fluttering | heron, hippo, horse, hummingbird |
| friendly, frosty, funky, fuzzy | iguana, jaguar, jellyfish, kangaroo |
| gentle, gleaming, gliding, glittery | kestrel, kingfisher, kiwi, koala |
| glowing, golden, graceful, grand | ladybird, lemur, leopard, lion |
| grassy, green, happy, hazy | lizard, llama, lobster, lynx |
| hopeful, icy, indigo, inventive | macaw, magpie, mallard, manatee |
| ivory, jade, jaunty, jazzy | meerkat, mongoose, moose, narwhal |
| jolly, joyful, leafy, lemon | newt, octopus, orangutan, orca |
| lilac, lively, lofty, lovely | osprey, ostrich, otter, owl |
| lucky, lunar, magical, majestic | panda, pangolin, panther, parrot |
| marvellous, mellow, merry, minty | pelican, penguin, pigeon, platypus |
| misty, nimble, noble, olive | pony, porcupine, puffin, quail |
| orange, playful, plucky, radiant | quokka, rabbit, raccoon, reindeer |
| rainbow, rosy, ruby, sandy | rhino, robin, salamander, seahorse |
| sapphire, scarlet, serene, shiny | seal, skylark, sparrow, squirrel |
| silky, silver, sleek, snowy | starfish, starling, stingray, stork |
| sparkling, spirited, starry, steady | swan, tapir, tiger, tortoise |
| stellar, sunny, swift, teal | toucan, trout, turtle, wallaby |
| twinkly, velvety, vibrant, violet | walrus, whale, wolf, wombat |
| warm, whimsical, windy, zesty | woodpecker, wren, yak, zebra |

Machine-readable versions: [JSON](username-wordlist-draft.json) and
[CSV](username-wordlist-draft.csv). The CSV has one category/word per row for
reviewing in a spreadsheet.

The server generator uses this JSON file as the single vocabulary source. Apply
migration 005 before deploying the updated staff function, and download refreshed
student previews to sign in with the new format. Existing `student-…` usernames,
passwords and progress remain valid. No existing account is renamed.

Each batch samples pairs without replacement and skips Auth email conflicts.
The Auth email unique constraint arbitrates concurrent requests. A racing
conflict can return a generic Auth error; this stops the batch safely. Unexpected
failures are not retried because account creation may already have succeeded.
A maximum of 128 occupied candidates is tried per student; if none is available,
the batch stops with the completed credentials and a warning. This keeps service
calls bounded as the vocabulary nears capacity. Expand the lists before that
point; 16,384 combinations is capacity, not a promise to fill every last slot in
a single request. The trusted operator CLI also retries known name conflicts and
writes replacement credentials to its private file before creating the account.
