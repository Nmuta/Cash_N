# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Clear existing data (optional - comment out if you want to preserve data)
puts "Clearing existing vices and monsters..."
Monster.destroy_all
Vice.destroy_all

# Create Vices based on the Seven Deadly Sins and modern interpretations
puts "Creating vices..."

vices = [
  {
    name: "Materialism",
    description: "An excessive desire for material wealth, possessions, and power. Materiaism drives one to hoard resources beyond necessity, often at the expense of others' well-being."
  },
  {
    name: "Gluttony",
    description: "Overindulgence and overconsumption of food, drink, or experiences. A compulsive desire for more than one needs, leading to waste and excess."
  },
  {
    name: "Envy",
    description: "Resentment and covetousness toward others' possessions, qualities, or achievements. The painful desire for what others have, coupled with ill will toward their success."
  },
  {
    name: "Wrath",
    description: "Uncontrolled anger, rage, and hatred that seeks revenge and destruction. A violent response rooted in impatience and the desire to harm those who have wronged you."
  },
  {
    name: "Promiscuity",
    description: "Intense craving for physical pleasures and sensual gratification. An overwhelming desire that prioritizes immediate satisfaction over long-term consequences."
  },
  {
    name: "Pride",
    description: "Excessive belief in one's own abilities and superiority over others. An inflated sense of self-importance that breeds contempt for those deemed inferior."
  },
  {
    name: "Sloth",
    description: "Laziness, apathy, and the failure to act on one's responsibilities. A spiritual and physical lethargy that prevents growth and achievement."
  },
  {
    name: "Vanity",
    description: "Excessive admiration of one's own appearance, talents, or achievements. An obsession with external validation and maintaining a perfect image."
  },
  {
    name: "Deceit",
    description: "The practice of lying, cheating, and manipulating truth for personal gain. A corruption of honesty that destroys trust and relationships."
  },
  {
    name: "Addiction",
    description: "Compulsive dependence on substances or behaviors despite harmful consequences. The loss of control over one's choices and the inability to stop despite knowing the damage."
  },
  {
    name: "Cruelty",
    description: "The deliberate infliction of pain and suffering on others. A callous disregard for the well-being of living creatures, often deriving pleasure from their torment."
  },
  {
    name: "Betrayal",
    description: "The violation of trust and loyalty to those who depend on you. Breaking sacred bonds and abandoning allies for personal advantage."
  }
]

created_vices = []
vices.each do |vice_data|
  vice = Vice.create!(vice_data)
  vice.image = vice_data[:name].downcase.gsub(" ", "_") + ".png"
  vice.save!
  created_vices << vice
  puts "  ✓ Created: #{vice.name}"
end

puts "\n#{created_vices.count} vices created successfully!"

# Optional: Create some sample monsters
puts "\nCreating sample monsters..."

sample_monsters = [
  {
    name: "Gold Hoarder",
    mesh_name: "dragon-gold.glb",
    vice: Vice.find_by(name: "Greed")
  },
  {
    name: "Feast Demon",
    mesh_name: "demon-gluttony.glb",
    vice: Vice.find_by(name: "Gluttony")
  },
  {
    name: "Shadow Stalker",
    mesh_name: "wraith-envy.glb",
    vice: Vice.find_by(name: "Envy")
  },
  {
    name: "Rage Titan",
    mesh_name: "titan-wrath.glb",
    vice: Vice.find_by(name: "Wrath")
  },
  {
    name: "Tempter Serpent",
    mesh_name: "serpent-lust.glb",
    vice: Vice.find_by(name: "Lust")
  },
  {
    name: "Arrogant King",
    mesh_name: "king-pride.glb",
    vice: Vice.find_by(name: "Pride")
  },
  {
    name: "Slumber Beast",
    mesh_name: "beast-sloth.glb",
    vice: Vice.find_by(name: "Sloth")
  }
]

sample_monsters.each do |monster_data|
  if monster_data[:vice]
    monster = Monster.create!(monster_data)
    puts "  ✓ Created: #{monster.name} (#{monster.vice.name})"
  end
end

puts "\n✨ Database seeded successfully!"
puts "   #{Vice.count} vices"
puts "   #{Monster.count} monsters"
