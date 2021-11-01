#   Work in progress

eno-context provides painless functionality to connect and contribute enovia services. 

## Example usage
```typescript
import Context from 'eno-context'

const myUser: Context = new Context({
    url3dspace: ..., // 3dspace url
    username: ..., // your username
    password: ..., // your password
    urlFederated: ... // optional parameter
});

myUser.connect() // connect to platform
    .then(ctx => ctx.get('/resources/v1/modeler/projects')) // get all accessible projects
    .then(console.log) // print retrieved projects data to console 
    .catch(e => {
        console.log(e)
    })
```
