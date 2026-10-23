# Draft student username word lists

For review before implementation. New usernames would use `adjective-animal`,
for example `marvellous-goat`, `funky-chicken` or `cosmic-otter`. Any adjective
can pair with any animal. UK spellings are used.

There are **128 adjectives × 128 animals = 16,384 distinct combinations**: over
16 times the expected maximum of 1,000 users. After 1,000 assigned names, 15,384
combinations would remain if none were reused. Expanding either list can add
capacity without renaming existing accounts.

The future generator must check school-wide uniqueness and select another pair
when a name is already taken. Random draws alone do not guarantee uniqueness.
Usernames remain identifiers; passwords provide sign-in protection.

The lists below are proposals for school review, including possible unintended
combinations or nicknames. All words use lowercase ASCII letters and have no
spaces or hyphens within a word.

| Adjectives | Animal nouns |
| --- | --- |
| adventurous, airy, amber, amusing | aardvark, alpaca, antelope, armadillo |
| animated, apricot, aqua, artistic | axolotl, badger, bat, bear |
| azure, beaming, blissful, blooming | bison, bobcat, buffalo, butterfly |
| blue, bold, bouncy, breezy | camel, capybara, chameleon, cheetah |
| bright, brisk, bubbly, calm | chicken, chipmunk, crab, crocodile |
| carefree, cheerful, cherry, chestnut | deer, dolphin, dragonfly, duck |
| chirpy, cinnamon, citrus, coastal | eagle, elephant, elk, emu |
| colourful, coral, cosmic, cosy | falcon, ferret, finch, firefly |
| curious, dancing, dapper, dazzling | flamingo, fox, frog, gazelle |
| dewy, dreamy, eager, electric | gecko, gerbil, gibbon, giraffe |
| emerald, enchanted, energetic, evergreen | goat, goldfinch, goldfish, gorilla |
| fabulous, fancy, fearless, festive | hamster, hare, hawk, hedgehog |
| fiery, fizzy, fluffy, fluttering | heron, hippo, horse, hummingbird |
| friendly, frosty, funky, furry | iguana, jaguar, jellyfish, kangaroo |
| fuzzy, gentle, gleaming, gliding | kestrel, kingfisher, kiwi, koala |
| glittery, glowing, golden, graceful | ladybird, lemur, leopard, lion |
| grand, grassy, green, happy | lizard, llama, lobster, lynx |
| hazy, hopeful, icy, indigo | macaw, magpie, mallard, manatee |
| inventive, ivory, jade, jaunty | meerkat, mongoose, moose, narwhal |
| jazzy, jolly, joyful, leafy | newt, octopus, orangutan, orca |
| lemon, lilac, lively, lofty | osprey, ostrich, otter, owl |
| lovely, lucky, lunar, magical | panda, pangolin, panther, parrot |
| majestic, marvellous, mellow, merry | pelican, penguin, pigeon, platypus |
| minty, misty, nimble, noble | pony, porcupine, puffin, quail |
| olive, orange, playful, plucky | quokka, rabbit, raccoon, reindeer |
| radiant, rainbow, rosy, ruby | rhino, robin, salamander, seahorse |
| sandy, sapphire, scarlet, serene | seal, skylark, sparrow, squirrel |
| shiny, silver, sleek, snowy | starfish, starling, stingray, stork |
| sparkling, spirited, starry, steady | swan, tapir, tiger, tortoise |
| stellar, sunny, swift, teal | toucan, trout, turtle, wallaby |
| twinkly, velvety, vibrant, violet | walrus, whale, wolf, wombat |
| warm, whimsical, windy, zesty | woodpecker, wren, yak, zebra |

Machine-readable versions: [JSON](username-wordlist-draft.json) and
[CSV](username-wordlist-draft.csv). The CSV has one category/word per row for
reviewing in a spreadsheet.

This draft does not change the generator, existing accounts, passwords or
progress. Enabling the format will require compatible account validation and a
new database migration; existing `student-…` usernames must remain valid.
