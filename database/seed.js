require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  try {
    // First, create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(500)
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        difficulty VARCHAR(50) CHECK(difficulty IN ('Easy','Medium','Advanced')),
        category_id INTEGER REFERENCES categories(id),
        author_id INTEGER REFERENCES users(id),
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        recipe_id INTEGER NOT NULL REFERENCES recipes(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        PRIMARY KEY (sid)
      );

      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `);
    
    console.log('Tables created successfully');

    // Clear existing data
    await pool.query('DELETE FROM favorites');
    await pool.query('DELETE FROM recipes');
    await pool.query('DELETE FROM categories');
    await pool.query('DELETE FROM users');

    // --- Seed Demo User ---
    const passwordHash = bcrypt.hashSync('aurae123', 12);
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['chef_aurae', 'chef@aurae.com', passwordHash, 'The Aurae Kitchen']
    );
    const userId = userResult.rows[0].id;
    console.log(`Seeded demo user: chef_aurae / aurae123`);

    // --- Seed Categories ---
    const categories = [
      {
        name: 'Breakfast',
        slug: 'breakfast',
        description: 'Morning rituals that set the tone for the day.',
        image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80'
      },
      {
        name: 'Lunch',
        slug: 'lunch',
        description: 'Midday plates that nourish and restore.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80'
      },
      {
        name: 'Dinner',
        slug: 'dinner',
        description: 'Evening gatherings around the table.',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'
      },
      {
        name: 'Desserts',
        slug: 'desserts',
        description: 'Sweet endings and indulgent moments.',
        image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80'
      },
      {
        name: 'Drinks',
        slug: 'drinks',
        description: 'Crafted beverages for every occasion.',
        image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80'
      },
      {
        name: 'Appetizers',
        slug: 'appetizers',
        description: 'Small plates that open the appetite.',
        image_url: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=600&q=80'
      },
      {
        name: 'Baking',
        slug: 'baking',
        description: 'The quiet art of flour, butter, and patience.',
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80'
      }
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const result = await pool.query(
        `INSERT INTO categories (name, slug, description, image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [cat.name, cat.slug, cat.description, cat.image_url]
      );
      categoryIds[cat.slug] = result.rows[0].id;
    }
    console.log(`Seeded ${categories.length} categories`);

    // --- Seed Recipes ---
    const recipes = [
      {
        title: 'Ricotta Pancakes with Roasted Figs',
        slug: 'ricotta-pancakes-roasted-figs',
        description: 'Cloud-soft pancakes enriched with fresh ricotta, crowned with honey-roasted figs and a scattering of pistachios. A breakfast that feels like a slow Sunday morning.',
        image_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80',
        prep_time: 15,
        cook_time: 20,
        servings: 4,
        difficulty: 'Easy',
        category: 'breakfast',
        ingredients: [
          '1 1/2 cups all-purpose flour',
          '1 cup fresh ricotta cheese',
          '2 large eggs, separated',
          '1 cup whole milk',
          '2 tablespoons honey, plus more for drizzling',
          '1 teaspoon vanilla extract',
          '1 1/2 teaspoons baking powder',
          'Pinch of sea salt',
          '8 fresh figs, halved',
          '2 tablespoons crushed pistachios',
          'Unsalted butter for cooking'
        ],
        instructions: [
          { step: 1, text: 'Whisk together flour, baking powder, and salt in a large bowl. In a separate bowl, combine ricotta, egg yolks, milk, honey, and vanilla until smooth.' },
          { step: 2, text: 'Beat egg whites to soft peaks with a hand mixer. Fold the wet ingredients into the dry, then gently fold in the egg whites. The batter should be airy and slightly lumpy.' },
          { step: 3, text: 'Preheat oven to 200°C. Arrange fig halves on a parchment-lined tray, drizzle with honey, and roast for 12-15 minutes until caramelized at the edges.' },
          { step: 4, text: 'Melt a knob of butter in a non-stick pan over medium-low heat. Pour quarter-cup portions of batter and cook until bubbles form on the surface, about 2-3 minutes. Flip and cook 1-2 minutes more.' },
          { step: 5, text: 'Stack the pancakes, arrange the roasted figs on top, drizzle with honey, and finish with crushed pistachios. Serve immediately.' }
        ]
      },
      {
        title: 'Seared Salmon with Herbed Citrus Butter',
        slug: 'seared-salmon-herbed-citrus-butter',
        description: 'Perfectly crisp-skinned salmon resting on a pool of lemon-herb compound butter. The kind of dinner that takes thirty minutes but looks like you spent the afternoon.',
        image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=80',
        prep_time: 10,
        cook_time: 15,
        servings: 2,
        difficulty: 'Medium',
        category: 'dinner',
        ingredients: [
          '2 salmon fillets, skin-on (6 oz each)',
          '4 tablespoons unsalted butter, softened',
          'Zest of 1 lemon',
          '1 tablespoon fresh lemon juice',
          '2 tablespoons fresh dill, finely chopped',
          '1 tablespoon fresh chives, minced',
          '1 clove garlic, minced',
          'Flaky sea salt and freshly cracked black pepper',
          '1 tablespoon olive oil',
          'Lemon wedges for serving'
        ],
        instructions: [
          { step: 1, text: 'Combine softened butter with lemon zest, juice, dill, chives, and garlic. Season with a pinch of salt. Roll into a small log in plastic wrap and refrigerate while you cook the salmon.' },
          { step: 2, text: 'Pat salmon fillets completely dry with paper towels. Season generously with flaky salt and pepper on both sides.' },
          { step: 3, text: 'Heat olive oil in a cast-iron skillet over medium-high heat until shimmering. Place salmon skin-side down and press gently with a spatula for the first 30 seconds to prevent curling.' },
          { step: 4, text: 'Cook without moving for 4-5 minutes until the skin is deeply golden and crisp. Flip and cook 2-3 minutes more for medium, or until done to your preference.' },
          { step: 5, text: 'Plate the salmon and immediately top each fillet with a thick coin of the herbed citrus butter. Let it melt into a glossy, aromatic pool. Serve with lemon wedges.' }
        ]
      },
      {
        title: 'Hand-Torn Pasta with Brown Butter & Sage',
        slug: 'hand-torn-pasta-brown-butter-sage',
        description: 'Rustic pasta pieces dressed in nutty brown butter with crispy sage leaves and a shower of aged Parmesan. This is Italian cooking at its most honest and elemental.',
        image_url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&q=80',
        prep_time: 30,
        cook_time: 15,
        servings: 4,
        difficulty: 'Medium',
        category: 'dinner',
        ingredients: [
          '400g tipo 00 flour (or all-purpose)',
          '4 large eggs',
          '1 tablespoon olive oil',
          'Pinch of salt',
          '100g unsalted butter',
          '20 fresh sage leaves',
          '80g Parmigiano-Reggiano, finely grated',
          'Freshly cracked black pepper',
          'Flaky sea salt'
        ],
        instructions: [
          { step: 1, text: 'Mound the flour on a clean work surface and create a deep well in the center. Crack in the eggs, add olive oil and salt. Using a fork, gradually incorporate flour from the inner walls.' },
          { step: 2, text: 'Once a shaggy dough forms, knead by hand for 8-10 minutes until smooth and elastic. The dough should spring back when pressed. Wrap in plastic and rest for 30 minutes.' },
          { step: 3, text: 'Roll the dough into thin sheets and tear into irregular 2-3 inch pieces. The rough edges are the point—they catch the butter beautifully.' },
          { step: 4, text: 'Bring a large pot of generously salted water to a rolling boil. Cook the pasta pieces for 2-3 minutes until they float and feel tender.' },
          { step: 5, text: 'Meanwhile, melt the butter in a wide pan over medium heat. Once it foams, add sage leaves and swirl continuously. The butter will turn golden, then amber, releasing a deeply nutty aroma. Remove from heat.' },
          { step: 6, text: 'Transfer pasta directly from the water into the brown butter with tongs, bringing some pasta water along. Toss vigorously to emulsify. Plate, finish with Parmesan, pepper, and flaky salt.' }
        ]
      },
      {
        title: 'Charred Lemon Caesar Salad',
        slug: 'charred-lemon-caesar-salad',
        description: 'A reimagined classic where charred lemon halves bring a smoky sweetness to the dressing, tossed with crisp romaine hearts and shards of sourdough croutons.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80',
        prep_time: 15,
        cook_time: 10,
        servings: 4,
        difficulty: 'Easy',
        category: 'lunch',
        ingredients: [
          '3 romaine hearts, halved lengthwise',
          '2 lemons, halved',
          '2 thick slices sourdough bread, torn into pieces',
          '3 tablespoons olive oil, divided',
          '2 anchovy fillets (or 1 tsp anchovy paste)',
          '1 garlic clove',
          '1 egg yolk',
          '1 teaspoon Dijon mustard',
          '60g Parmigiano-Reggiano, shaved',
          'Freshly cracked black pepper'
        ],
        instructions: [
          { step: 1, text: 'Heat a cast-iron skillet over high heat. Place lemon halves cut-side down directly on the hot surface. Char for 3-4 minutes until deep caramel brown. Set aside.' },
          { step: 2, text: 'In the same skillet, toss the bread pieces with 1 tablespoon olive oil, salt, and pepper. Toast until golden and crispy, about 5 minutes. Keep warm.' },
          { step: 3, text: 'For the dressing: Mince the garlic and anchovies into a paste in a large bowl. Squeeze the charred lemon halves to extract the juice and pulp. Add the juice, egg yolk, mustard, and Dijon, whisking well.' },
          { step: 4, text: 'Slowly whisk in the remaining 2 tablespoons olive oil until the dressing is emulsified and creamy. Taste and adjust with salt and pepper.' },
          { step: 5, text: 'Toss the romaine halves in the dressing until every leaf is lightly coated. Arrange on a platter, scatter the croutons and shaved Parmesan on top, finish with a crack of black pepper, and serve immediately.' }
        ]
      },
      {
        title: 'Dark Chocolate Olive Oil Cake',
        slug: 'dark-chocolate-olive-oil-cake',
        description: 'Dense, fudgy, and profoundly chocolatey—this flourless cake uses fine olive oil instead of butter, lending a subtle peppery finish that makes the chocolate sing.',
        image_url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1200&q=80',
        prep_time: 20,
        cook_time: 35,
        servings: 8,
        difficulty: 'Medium',
        category: 'desserts',
        ingredients: [
          '200g dark chocolate (70% cocoa), chopped',
          '150ml extra-virgin olive oil, plus more for pan',
          '150g caster sugar',
          '3 large eggs',
          '60g almond flour',
          '30g Dutch-process cocoa powder',
          '1/2 teaspoon flaky sea salt',
          '1 teaspoon vanilla extract',
          'Crème fraîche for serving',
          'Cocoa powder for dusting'
        ],
        instructions: [
          { step: 1, text: 'Preheat oven to 170°C. Oil a 9-inch round springform pan and line the bottom with parchment. Melt chocolate in a heatproof bowl set over simmering water, then stir in olive oil until glossy.' },
          { step: 2, text: 'Whisk eggs and sugar together vigorously for 3 minutes until pale and thickened. The mixture should fall in ribbons from the whisk.' },
          { step: 3, text: 'Fold the chocolate-oil mixture into the eggs. Sift in almond flour, cocoa powder, and salt, folding gently until just combined. Add vanilla.' },
          { step: 4, text: 'Pour into the prepared pan and bake for 30-35 minutes. The center should be just set with a slight wobble—it firms as it cools. A crack across the top is welcome.' },
          { step: 5, text: 'Cool in the pan for 15 minutes, then unmold. Dust with cocoa powder and serve barely warm with a spoonful of crème fraîche.' }
        ]
      },
      {
        title: 'Spiced Cauliflower Soup with Crispy Chickpeas',
        slug: 'spiced-cauliflower-soup-crispy-chickpeas',
        description: 'A velvety, warmly spiced soup topped with shatteringly crisp chickpeas and a swirl of herb oil. Comfort in its most elegant form.',
        image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=80',
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'Easy',
        category: 'lunch',
        ingredients: [
          '1 large head cauliflower, cut into florets',
          '1 can (400g) chickpeas, drained and patted dry',
          '1 medium onion, diced',
          '3 cloves garlic, sliced',
          '1 teaspoon ground cumin',
          '1/2 teaspoon ground turmeric',
          '1/4 teaspoon cayenne pepper',
          '4 cups vegetable stock',
          '3 tablespoons olive oil, divided',
          'Handful fresh cilantro',
          'Juice of 1 lemon',
          'Flaky sea salt'
        ],
        instructions: [
          { step: 1, text: 'Heat 2 tablespoons olive oil in a large pot over medium heat. Cook onion until soft and translucent, about 5 minutes. Add garlic, cumin, turmeric, and cayenne, stirring for 1 minute until fragrant.' },
          { step: 2, text: 'Add cauliflower florets and vegetable stock. Bring to a boil, then reduce heat and simmer for 20 minutes until cauliflower is completely tender.' },
          { step: 3, text: 'Meanwhile, toss dried chickpeas with 1 tablespoon olive oil and a pinch of salt. Spread on a baking sheet and roast at 200°C for 20-25 minutes, shaking halfway, until golden and crispy.' },
          { step: 4, text: 'Blend the soup until silky smooth using an immersion blender. Stir in lemon juice and season to taste.' },
          { step: 5, text: 'Ladle into warm bowls, top with crispy chickpeas, a drizzle of olive oil, and torn cilantro leaves.' }
        ]
      },
      {
        title: 'Sourdough Focaccia with Sea Salt & Rosemary',
        slug: 'sourdough-focaccia-sea-salt-rosemary',
        description: 'Golden-crusted, dimpled focaccia with an impossibly open crumb. The top glistens with olive oil pools, flaky salt crystals, and fragrant rosemary needles.',
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
        prep_time: 30,
        cook_time: 25,
        servings: 8,
        difficulty: 'Advanced',
        category: 'baking',
        ingredients: [
          '500g bread flour',
          '375ml warm water',
          '100g active sourdough starter',
          '10g fine sea salt',
          '4 tablespoons extra-virgin olive oil, divided',
          '3 sprigs fresh rosemary',
          'Flaky sea salt for finishing',
          '1 teaspoon honey'
        ],
        instructions: [
          { step: 1, text: 'Dissolve honey in warm water, then stir in the sourdough starter until dispersed. Add flour and mix until no dry spots remain. Rest for 30 minutes (autolyse).' },
          { step: 2, text: 'Sprinkle salt over the dough and incorporate using the stretch-and-fold method. Perform stretch-and-folds every 30 minutes for the next 2 hours (4 sets total).' },
          { step: 3, text: 'Pour 2 tablespoons olive oil into a deep baking dish. Transfer the dough, turning to coat in oil. Cover and refrigerate overnight (12-18 hours) for a slow, flavorful ferment.' },
          { step: 4, text: 'Remove from the fridge and let come to room temperature for 2 hours. The dough should be puffy and bubbly. Drizzle with remaining olive oil and dimple deeply with wet fingertips.' },
          { step: 5, text: 'Press rosemary needles into the dimples and scatter flaky salt generously. Bake at 230°C for 22-25 minutes until deeply golden on top and bottom.' },
          { step: 6, text: 'Cool on a wire rack for at least 10 minutes before tearing into it. Listen for the crackle.' }
        ]
      },
      {
        title: 'Burrata with Stone Fruit & Basil',
        slug: 'burrata-stone-fruit-basil',
        description: 'The simplest of summer plates: cloud-like burrata split open to reveal its creamy heart, surrounded by ripe peaches, torn basil, and a drizzle of aged balsamic.',
        image_url: 'https://images.unsplash.com/photo-1505575967455-40e256f73376?w=1200&q=80',
        prep_time: 10,
        cook_time: 0,
        servings: 4,
        difficulty: 'Easy',
        category: 'appetizers',
        ingredients: [
          '2 large balls fresh burrata',
          '3 ripe peaches or nectarines, sliced into wedges',
          'Large handful fresh basil leaves',
          '2 tablespoons aged balsamic vinegar',
          '3 tablespoons best-quality extra-virgin olive oil',
          'Flaky sea salt and freshly cracked black pepper',
          '2 tablespoons pine nuts, lightly toasted'
        ],
        instructions: [
          { step: 1, text: 'Arrange peach wedges on a wide serving platter, leaving space in the center. Let the fruit come to room temperature for the best flavor.' },
          { step: 2, text: 'Place the burrata in the center of the platter. Using your hands, gently tear each ball open so the creamy stracciatella center spills out.' },
          { step: 3, text: 'Scatter torn basil leaves and toasted pine nuts over everything. Drizzle generously with olive oil, then the balsamic.' },
          { step: 4, text: 'Finish with flaky salt and cracked pepper. Serve immediately with crusty bread on the side. This does not wait.' }
        ]
      },
      {
        title: 'Honey Lavender Panna Cotta',
        slug: 'honey-lavender-panna-cotta',
        description: 'Trembling, barely set, perfumed with dried lavender and wildflower honey. A dessert of extraordinary delicacy that requires almost no effort.',
        image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=80',
        prep_time: 15,
        cook_time: 5,
        servings: 6,
        difficulty: 'Easy',
        category: 'desserts',
        ingredients: [
          '500ml heavy cream',
          '150ml whole milk',
          '60g wildflower honey',
          '1 tablespoon dried culinary lavender',
          '2 1/4 teaspoons powdered gelatin',
          '3 tablespoons cold water',
          '1 teaspoon vanilla bean paste',
          'Fresh berries for serving',
          'Extra honey for drizzling'
        ],
        instructions: [
          { step: 1, text: 'Sprinkle gelatin over cold water in a small bowl and let bloom for 5 minutes. It will become spongy and opaque.' },
          { step: 2, text: 'Warm cream, milk, honey, and lavender in a saucepan over medium heat until it just begins to steam. Do not boil. Remove from heat, cover, and steep for 15 minutes.' },
          { step: 3, text: 'Strain out the lavender through a fine-mesh sieve. Return cream to low heat and stir in the bloomed gelatin until fully dissolved. Add vanilla bean paste.' },
          { step: 4, text: 'Pour into six serving glasses or ramekins. Cool to room temperature, then refrigerate for at least 4 hours (overnight is best) until set with a gentle wobble.' },
          { step: 5, text: 'Serve topped with fresh berries and a thread of honey. The panna cotta should tremble when you tap the glass.' }
        ]
      },
      {
        title: 'Mezcal Paloma with Grapefruit & Chili Salt',
        slug: 'mezcal-paloma-grapefruit-chili-salt',
        description: 'The classic Paloma, elevated with smoky mezcal and a chili-salt rim that tingles. Pink grapefruit juice keeps it bright and crushable.',
        image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80',
        prep_time: 10,
        cook_time: 0,
        servings: 2,
        difficulty: 'Easy',
        category: 'drinks',
        ingredients: [
          '120ml mezcal (joven)',
          '180ml fresh pink grapefruit juice',
          '30ml fresh lime juice',
          '20ml agave syrup',
          'Sparkling water',
          '1 tablespoon flaky salt',
          '1 teaspoon chili powder (ancho or Tajín)',
          'Grapefruit slices for garnish',
          'Ice'
        ],
        instructions: [
          { step: 1, text: 'Mix flaky salt and chili powder on a small plate. Run a grapefruit wedge around the rim of two glasses, then dip the rims into the chili salt mixture.' },
          { step: 2, text: 'Fill the glasses with ice. Divide the mezcal, grapefruit juice, lime juice, and agave syrup between them.' },
          { step: 3, text: 'Stir gently to combine, then top each glass with a splash of sparkling water.' },
          { step: 4, text: 'Garnish with a half-moon slice of grapefruit. Sip slowly—the smoke, citrus, and heat are meant to be savored.' }
        ]
      },
      {
        title: 'Grilled Lamb Chops with Mint Gremolata',
        slug: 'grilled-lamb-chops-mint-gremolata',
        description: 'Charred on the outside, rosy within, these lamb chops are finished with a bright, herbaceous gremolata that cuts through the richness with precision.',
        image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1200&q=80',
        prep_time: 15,
        cook_time: 10,
        servings: 4,
        difficulty: 'Medium',
        category: 'dinner',
        ingredients: [
          '8 lamb loin chops (about 1 inch thick)',
          '3 tablespoons olive oil',
          '4 cloves garlic, minced',
          '1 cup fresh mint leaves, finely chopped',
          '1/4 cup fresh flat-leaf parsley, finely chopped',
          'Zest of 1 lemon',
          '2 tablespoons lemon juice',
          '1 teaspoon red pepper flakes',
          'Flaky sea salt and freshly cracked black pepper'
        ],
        instructions: [
          { step: 1, text: 'Remove lamb chops from the fridge 30 minutes before cooking. Pat dry and season generously on all sides with salt, pepper, and a drizzle of olive oil.' },
          { step: 2, text: 'Make the gremolata: combine mint, parsley, lemon zest, half the garlic, red pepper flakes, lemon juice, and 2 tablespoons olive oil. Season with salt and set aside.' },
          { step: 3, text: 'Heat a grill pan or outdoor grill to high heat. Sear lamb chops for 3-4 minutes per side for medium-rare. The fat cap should be rendered and golden.' },
          { step: 4, text: 'Rest the chops on a warm plate for 5 minutes, loosely tented with foil. This is not optional—resting is where the magic happens.' },
          { step: 5, text: 'Arrange on a platter and spoon the mint gremolata generously over each chop. Serve with crusty bread to soak up every drop.' }
        ]
      },
      {
        title: 'Shakshuka with Herbed Yogurt',
        slug: 'shakshuka-herbed-yogurt',
        description: 'Eggs poached in a spiced, smoky tomato sauce, finished with cool dollops of herbed yogurt. Best eaten directly from the pan with warm flatbread.',
        image_url: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=1200&q=80',
        prep_time: 10,
        cook_time: 25,
        servings: 4,
        difficulty: 'Easy',
        category: 'breakfast',
        ingredients: [
          '6 large eggs',
          '1 can (400g) crushed San Marzano tomatoes',
          '1 red bell pepper, diced',
          '1 medium onion, diced',
          '3 cloves garlic, sliced',
          '1 teaspoon ground cumin',
          '1 teaspoon smoked paprika',
          '1/2 teaspoon chili flakes',
          '150g Greek yogurt',
          '2 tablespoons fresh dill, chopped',
          '1 tablespoon fresh lemon juice',
          '3 tablespoons olive oil',
          'Warm flatbread for serving',
          'Flaky sea salt'
        ],
        instructions: [
          { step: 1, text: 'Heat olive oil in a deep skillet over medium heat. Cook onion and bell pepper until softened, about 6 minutes. Add garlic, cumin, paprika, and chili flakes, stirring for 1 minute.' },
          { step: 2, text: 'Pour in crushed tomatoes, season with salt, and simmer for 10 minutes until the sauce thickens and deepens in color.' },
          { step: 3, text: 'Make 6 small wells in the sauce with the back of a spoon. Crack an egg into each well. Cover and cook on low heat for 6-8 minutes until the whites are set but the yolks are still runny.' },
          { step: 4, text: 'While eggs cook, combine yogurt with dill, lemon juice, and a pinch of salt.' },
          { step: 5, text: 'Remove from heat, dollop the herbed yogurt between the eggs, and scatter with extra dill. Serve immediately with warm flatbread torn into pieces.' }
        ]
      },
      {
        title: 'Raspberry Rose Tart',
        slug: 'raspberry-rose-tart',
        description: 'A buttery almond crust filled with rose-scented pastry cream and shingled with fresh raspberries. Almost too beautiful to eat, but you absolutely should.',
        image_url: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=1200&q=80',
        prep_time: 40,
        cook_time: 25,
        servings: 8,
        difficulty: 'Advanced',
        category: 'baking',
        ingredients: [
          '200g all-purpose flour',
          '60g almond flour',
          '100g cold unsalted butter, cubed',
          '60g powdered sugar',
          '1 egg yolk',
          '2 tablespoons ice water',
          '300ml whole milk',
          '3 egg yolks',
          '60g caster sugar',
          '30g cornstarch',
          '1 teaspoon rose water',
          '300g fresh raspberries',
          '2 tablespoons apricot jam for glazing'
        ],
        instructions: [
          { step: 1, text: 'Pulse flour, almond flour, powdered sugar, and butter in a food processor until it resembles coarse sand. Add egg yolk and water, pulse until the dough just comes together. Wrap and chill for 1 hour.' },
          { step: 2, text: 'Roll out the pastry and press into a 9-inch tart pan with removable bottom. Prick the base with a fork, line with parchment and baking beans. Blind bake at 180°C for 15 minutes, remove weights, and bake 8-10 minutes more until golden.' },
          { step: 3, text: 'For the pastry cream: whisk egg yolks, sugar, and cornstarch until pale. Heat milk until steaming, then slowly pour into the egg mixture while whisking constantly. Return to the pan and cook over medium heat, whisking vigorously, until thick. Stir in rose water. Press plastic wrap directly onto the surface and chill.' },
          { step: 4, text: 'Spread the chilled pastry cream into the cooled tart shell in an even layer. Arrange raspberries in concentric circles, starting from the outside edge, pointed ends up.' },
          { step: 5, text: 'Warm apricot jam with a splash of water, then brush lightly over the raspberries for a delicate glaze. Serve within a few hours for the crispest crust.' }
        ]
      },
      {
        title: 'Vietnamese Iced Coffee',
        slug: 'vietnamese-iced-coffee',
        description: 'Strong, dark-roasted coffee slowly dripped through a phin filter, swirled with sweetened condensed milk over ice. Bold, sweet, and absolutely addictive.',
        image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1200&q=80',
        prep_time: 5,
        cook_time: 10,
        servings: 1,
        difficulty: 'Easy',
        category: 'drinks',
        ingredients: [
          '2 tablespoons dark-roast ground coffee (coarse)',
          '2-3 tablespoons sweetened condensed milk',
          '6-8 oz boiling water',
          'Ice cubes',
          'Vietnamese phin filter (or use strong French press coffee)'
        ],
        instructions: [
          { step: 1, text: 'Add sweetened condensed milk to the bottom of a heatproof glass. The amount is personal—start with 2 tablespoons.' },
          { step: 2, text: 'Place the phin filter on top of the glass. Add coffee grounds and gently press the inner filter down. Pour a small amount of boiling water to bloom the grounds, wait 20 seconds.' },
          { step: 3, text: 'Fill the filter with remaining hot water, cover with the lid, and let it drip slowly. This should take 4-5 minutes. Patience is the entire recipe.' },
          { step: 4, text: 'Once fully dripped, remove the filter. Stir vigorously to combine the coffee and condensed milk. Fill a tall glass with ice and pour the sweet coffee over. Watch the beautiful swirl.' }
        ]
      },
      {
        title: 'Garden Herb Frittata',
        slug: 'garden-herb-frittata',
        description: 'A celebration of spring herbs folded into custardy eggs and finished under the broiler. Served warm or at room temperature, it\'s the ideal one-pan dinner.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80',
        prep_time: 10,
        cook_time: 20,
        servings: 4,
        difficulty: 'Easy',
        category: 'lunch',
        ingredients: [
          '8 large eggs',
          '1/4 cup heavy cream',
          '2 tablespoons butter',
          '1 small onion, thinly sliced',
          '2 cloves garlic, minced',
          '3 cups mixed fresh herbs (dill, parsley, chives, tarragon)',
          '1 cup fresh spinach',
          '80g crumbled goat cheese',
          'Salt and freshly cracked black pepper',
          'Zest of 1 lemon for garnish'
        ],
        instructions: [
          { step: 1, text: 'Preheat the broiler. Whisk together eggs and cream in a large bowl, season with salt and pepper, set aside.' },
          { step: 2, text: 'Heat butter in a 10-inch oven-safe skillet over medium heat. Add onion and cook gently for 3-4 minutes until softened. Add garlic and cook 1 minute more.' },
          { step: 3, text: 'Roughly chop the fresh herbs and add them to the pan with the spinach, tossing until the spinach just wilts, about 1 minute.' },
          { step: 4, text: 'Pour the egg mixture evenly over the vegetables and herbs. Scatter the goat cheese over the top. Cook on the stovetop for 4-5 minutes until the edges are set but the center is still jiggly.' },
          { step: 5, text: 'Place the skillet under the broiler for 3-4 minutes until the top is lightly golden and springs back when you touch it. Remove and let cool for 2 minutes.' },
          { step: 6, text: 'Slice into wedges and finish with a sprinkle of fresh lemon zest. Serve warm or at room temperature.' }
        ]
      },
      {
        title: 'Dark Chocolate Mousse with Sea Salt',
        slug: 'dark-chocolate-mousse-sea-salt',
        description: 'Silky, cloud-like mousse made with melted dark chocolate, whipped to airy perfection, finished with a whisper of fleur de sel. Elegance in a glass.',
        image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&q=80',
        prep_time: 15,
        cook_time: 0,
        servings: 6,
        difficulty: 'Easy',
        category: 'desserts',
        ingredients: [
          '200g dark chocolate (70% cacao), chopped',
          '75g unsalted butter, sliced',
          '1/4 cup water',
          '1 tablespoon espresso powder',
          '4 large eggs, separated',
          '2 tablespoons sugar',
          '1/2 teaspoon vanilla extract',
          '1/4 teaspoon fleur de sel, plus more for garnish',
          'Whipped cream for serving (optional)'
        ],
        instructions: [
          { step: 1, text: 'Melt the chocolate and butter together over a double boiler or in short 30-second bursts in the microwave. Stir in the water and espresso powder until smooth. Let cool for 5 minutes.' },
          { step: 2, text: 'Whisk the egg yolks into the chocolate until well combined. Stir in the vanilla and fleur de sel.' },
          { step: 3, text: 'In a separate, completely clean bowl, beat the egg whites and sugar with a hand mixer until stiff peaks form.' },
          { step: 4, text: 'Gently fold the egg whites into the chocolate mixture in two additions, being careful not to deflate the whites.' },
          { step: 5, text: 'Divide among serving glasses or bowls and refrigerate for at least 2 hours or up to 8 hours.' },
          { step: 6, text: 'Top each mousse with a whisper of fleur de sel and a dollop of whipped cream if desired.' }
        ]
      }
    ];

    for (const recipe of recipes) {
      const categoryId = categoryIds[recipe.category];
      await pool.query(
        `INSERT INTO recipes (title, slug, description, image_url, prep_time, cook_time, servings, difficulty, category_id, author_id, ingredients, instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          recipe.title,
          recipe.slug,
          recipe.description,
          recipe.image_url,
          recipe.prep_time,
          recipe.cook_time,
          recipe.servings,
          recipe.difficulty,
          categoryId,
          userId,
          JSON.stringify(recipe.ingredients),
          JSON.stringify(recipe.instructions)
        ]
      );
    }
    console.log(`Seeded ${recipes.length} recipes`);
    console.log('\nDatabase seeding complete!');
    console.log('Demo login: chef_aurae / aurae123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed
seedDatabase();

