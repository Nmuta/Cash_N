// Import and register all your controllers from the importmap via controllers/**/*_controller
import { application } from "controllers/application"

import helloController from "controllers/hello_controller"
application.register("hello", helloController)


import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading"
eagerLoadControllersFrom("controllers", application)
