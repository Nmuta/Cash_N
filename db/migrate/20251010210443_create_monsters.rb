class CreateMonsters < ActiveRecord::Migration[7.1]
  def change
    create_table :monsters do |t|
      t.string :name, null: false
      t.string :mesh_name, null: false
      t.references :vice, null: false, foreign_key: true

      t.timestamps
    end

    add_index :monsters, :name
    add_index :monsters, :mesh_name
  end
end

