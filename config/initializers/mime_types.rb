# Register MIME type for ES modules with .mjs extension
Mime::Type.register "text/javascript", :mjs unless Mime::Type.lookup_by_extension(:mjs)
