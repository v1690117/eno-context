#   Work in progress

eno-context provides painless functionality to connect and contribute enovia services. 

## Example usage
```javascript
const myUser: Context = new Context({
    host: ..., // 3dspace url
    passport: ..., // 3dpassport url
    username: ..., // your username
    password: ... // your password
});

myUser.connect() // connect to platform
    .then(ctx => ctx.get('/resources/v1/modeler/projects')) // get all accessible projects
    .then(console.log) // print retrieved projects data to console 
    .catch(e => {
        console.log(e)
    })

```