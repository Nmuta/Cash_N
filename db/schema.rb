# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_11_18_002000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "buddyships", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "buddy_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["buddy_id"], name: "index_buddyships_on_buddy_id"
    t.index ["user_id", "buddy_id"], name: "index_buddyships_on_user_id_and_buddy_id", unique: true
    t.index ["user_id"], name: "index_buddyships_on_user_id"
  end

  create_table "monsters", force: :cascade do |t|
    t.string "name", null: false
    t.string "mesh_name", null: false
    t.bigint "vice_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["mesh_name"], name: "index_monsters_on_mesh_name"
    t.index ["name"], name: "index_monsters_on_name"
    t.index ["vice_id"], name: "index_monsters_on_vice_id"
  end

  create_table "place_types", force: :cascade do |t|
    t.string "name", null: false
    t.string "image_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_place_types_on_name", unique: true
  end

  create_table "places", force: :cascade do |t|
    t.string "name", null: false
    t.decimal "latitude", precision: 10, scale: 6, null: false
    t.decimal "longitude", precision: 10, scale: 6, null: false
    t.bigint "place_type_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["place_type_id"], name: "index_places_on_place_type_id"
    t.index ["user_id", "name"], name: "index_places_on_user_id_and_name"
    t.index ["user_id"], name: "index_places_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "wizard_finished", default: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "users_vices", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "vice_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "vice_id"], name: "index_users_vices_on_user_id_and_vice_id", unique: true
    t.index ["user_id"], name: "index_users_vices_on_user_id"
    t.index ["vice_id"], name: "index_users_vices_on_vice_id"
  end

  create_table "vices", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "image"
    t.index ["name"], name: "index_vices_on_name", unique: true
  end

  add_foreign_key "buddyships", "users"
  add_foreign_key "buddyships", "users", column: "buddy_id"
  add_foreign_key "monsters", "vices"
  add_foreign_key "places", "place_types"
  add_foreign_key "places", "users"
  add_foreign_key "users_vices", "users"
  add_foreign_key "users_vices", "vices"
end
