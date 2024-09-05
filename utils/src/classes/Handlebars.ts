import Handlebars from "handlebars"

import { capFirst } from "../helpers/capFirst.js"
import { ifValue } from "../helpers/ifValue.js"
import { eq } from "../helpers/eq.js"
import { localize } from "../helpers/localize.js"
import { noRefs } from "../helpers/noRefs.js"
import { regularize } from "../helpers/regularize.js"
import { log } from "../helpers/log.js"

Handlebars.registerHelper("capFirst", capFirst)
Handlebars.registerHelper("ifValue", ifValue)
Handlebars.registerHelper("eq", eq)
Handlebars.registerHelper("localize", localize)
Handlebars.registerHelper("noRefs", noRefs)
Handlebars.registerHelper("regularize", regularize)
Handlebars.registerHelper("log", log)

export { Handlebars }

export interface env {
  mrg: {
    website: string
  }
  int: {
    regex: RegExp
  }
}
