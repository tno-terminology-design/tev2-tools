import Handlebars from "handlebars"

import { capFirst } from "../helpers/capFirst.js"
import { ifValue } from "../helpers/ifValue.js"
import { localize } from "../helpers/localize.js"
import { log } from "../helpers/log.js"
import { noRefs } from "../helpers/noRefs.js"
import { regularize } from "../helpers/regularize.js"
import { sort } from "../helpers/sort.js"

Handlebars.registerHelper("capFirst", capFirst)
Handlebars.registerHelper("ifValue", ifValue)
Handlebars.registerHelper("localize", localize)
Handlebars.registerHelper("log", log)
Handlebars.registerHelper("noRefs", noRefs)
Handlebars.registerHelper("regularize", regularize)
Handlebars.registerHelper("sort", sort)

export { Handlebars }

export interface env {
  mrg: {
    website: string
  }
  int: {
    regex: RegExp
  }
}
