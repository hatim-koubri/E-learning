import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

const apiUrl=String.fromEnvironment('API_URL',defaultValue:'http://10.0.2.2:8080/api');
void main(){WidgetsFlutterBinding.ensureInitialized();runApp(const ElearningApp());}
class ApiError implements Exception{final String message;const ApiError(this.message);}
class ApiClient{
 final storage=const FlutterSecureStorage();
 Future<dynamic> call(String path,{String method='GET',Object? body,Map<String,String>?headers})async{
  if((await Connectivity().checkConnectivity()).contains(ConnectivityResult.none))throw const ApiError('Vous êtes hors ligne.');
  final token=await storage.read(key:'jwt'),request=http.Request(method,Uri.parse('$apiUrl$path'));
  request.headers.addAll({'Content-Type':'application/json',if(token!=null)'Authorization':'Bearer $token',...?headers});
  if(body!=null)request.body=jsonEncode(body);final response=await request.send(),text=await response.stream.bytesToString();
  if(response.statusCode==401){await storage.delete(key:'jwt');throw const ApiError('Session expirée. Reconnectez-vous.');}
  if(response.statusCode>=400){dynamic data;try{data=jsonDecode(text);}catch(_){data=null;}throw ApiError(data is Map&&data['message']!=null?data['message']:'Une erreur est survenue.');}
  return text.isEmpty?null:jsonDecode(text);
 }
}
class ElearningApp extends StatelessWidget{const ElearningApp({super.key});@override Widget build(BuildContext context)=>MaterialApp(title:'E-learning',theme:ThemeData(colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xff3157d5)),useMaterial3:true),home:const LoginPage());}
class LoginPage extends StatefulWidget{const LoginPage({super.key});@override State<LoginPage>createState()=>_LoginPageState();}
class _LoginPageState extends State<LoginPage>{
 final email=TextEditingController(),password=TextEditingController();String?error;bool busy=false;
 Future<void>login()async{setState(()=>busy=true);try{final d=await ApiClient().call('/auth/login',method:'POST',body:{'email':email.text,'password':password.text});await const FlutterSecureStorage().write(key:'jwt',value:d['accessToken']);if(mounted)Navigator.pushReplacement(context,MaterialPageRoute(builder:(_)=>const HomePage()));}catch(e){setState(()=>error=e is ApiError?e.message:'Connexion impossible.');}finally{if(mounted)setState(()=>busy=false);}}
 @override Widget build(BuildContext c)=>Scaffold(body:SafeArea(child:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:420),child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[const Icon(Icons.school,size:64),Text('Bienvenue',style:Theme.of(c).textTheme.headlineMedium),TextField(controller:email,decoration:const InputDecoration(labelText:'Email')),TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Mot de passe')),if(error!=null)Text(error!,style:const TextStyle(color:Colors.red)),FilledButton(onPressed:busy?null:login,child:Text(busy?'Connexion…':'Se connecter'))]))))));
}
class HomePage extends StatefulWidget{const HomePage({super.key});@override State<HomePage>createState()=>_HomePageState();}
class _HomePageState extends State<HomePage>{
 int tab=0;@override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('E-learning'),actions:[IconButton(icon:const Icon(Icons.logout),onPressed:()async{await const FlutterSecureStorage().deleteAll();if(c.mounted)Navigator.pushReplacement(c,MaterialPageRoute(builder:(_)=>const LoginPage()));})]),body:[const CataloguePage(),const MyCoursesPage(),const ClassesPage()][tab],bottomNavigationBar:NavigationBar(selectedIndex:tab,onDestinationSelected:(v)=>setState(()=>tab=v),destinations:const[NavigationDestination(icon:Icon(Icons.search),label:'Catalogue'),NavigationDestination(icon:Icon(Icons.menu_book),label:'Mes formations'),NavigationDestination(icon:Icon(Icons.video_call),label:'Mes classes')]));
}
class CataloguePage extends StatefulWidget{const CataloguePage({super.key});@override State<CataloguePage>createState()=>_CataloguePageState();}
class _CataloguePageState extends State<CataloguePage>{
 final search=TextEditingController();Future<dynamic>?result;@override void initState(){super.initState();load();}void load()=>setState(()=>result=ApiClient().call('/catalogue?q=${Uri.encodeQueryComponent(search.text)}&size=20'));
 @override Widget build(BuildContext c)=>Column(children:[Padding(padding:const EdgeInsets.all(12),child:TextField(controller:search,onSubmitted:(_)=>load(),decoration:InputDecoration(labelText:'Rechercher',suffixIcon:IconButton(onPressed:load,icon:const Icon(Icons.search))))),Expanded(child:FutureBuilder(future:result,builder:(c,s){if(s.hasError)return ErrorView(s.error);if(!s.hasData)return const Center(child:CircularProgressIndicator());final items=(s.data as Map)['content']as List;return ListView.builder(itemCount:items.length,itemBuilder:(_,i)=>CourseTile(items[i]));}))]);
}
class CourseTile extends StatelessWidget{final Map course;const CourseTile(this.course,{super.key});@override Widget build(BuildContext c)=>ListTile(title:Text(course['titre']),subtitle:Text('${course['categorie']??''} • ${course['prix']??''} DH'),trailing:const Icon(Icons.chevron_right),onTap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>CoursePage(id:course['formationId']??course['id']))));}
class MyCoursesPage extends StatelessWidget{const MyCoursesPage({super.key});@override Widget build(BuildContext c)=>FutureBuilder(future:ApiClient().call('/participant/formations'),builder:(c,s){if(s.hasError)return ErrorView(s.error);if(!s.hasData)return const Center(child:CircularProgressIndicator());final items=s.data as List;if(items.isEmpty)return const Center(child:Text('Aucune formation.'));return ListView(children:items.map((f)=>CourseTile(f)).toList());});}
class CoursePage extends StatefulWidget{final int id;const CoursePage({required this.id,super.key});@override State<CoursePage>createState()=>_CoursePageState();}
class _CoursePageState extends State<CoursePage>{
 late Future<dynamic>detail;@override void initState(){super.initState();detail=ApiClient().call('/catalogue/${widget.id}');}
 Future<void>upgrade()async{try{await ApiClient().call('/participant/formations/${widget.id}/upgrade-classes',method:'POST',headers:{'Idempotency-Key':'mobile-${widget.id}'});message('Accès avec classes activé.');}catch(e){message(e is ApiError?e.message:'Mise à niveau impossible.');}}
 void message(String value){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(value)));}
 Future<void>open(int chapterId,Map r)async{try{final a=await ApiClient().call('/catalogue/${widget.id}/ressources/${r['id']}/acces');await launchUrl(Uri.parse(a['url']),mode:LaunchMode.externalApplication);await ApiClient().call('/participant/formations/${widget.id}/chapitres/$chapterId/progression',method:'PUT',body:{'termine':true,'positionVideoSecondes':0});}catch(e){message(e is ApiError?e.message:'Ressource inaccessible.');}}
 @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('Formation')),body:FutureBuilder(future:detail,builder:(c,s){if(s.hasError)return ErrorView(s.error);if(!s.hasData)return const Center(child:CircularProgressIndicator());final f=s.data as Map;return ListView(padding:const EdgeInsets.all(16),children:[Text(f['titre'],style:Theme.of(c).textTheme.headlineMedium),Text(f['description']),if(f['inscrit']==true)OutlinedButton(onPressed:upgrade,child:const Text('Passer à l’offre avec classes')),...(f['modules']as List).map((m)=>ExpansionTile(title:Text(m['titre']),subtitle:Text(m['verrouille']?'Verrouillé':m['apercuGratuit']?'Aperçu gratuit':'Accessible'),children:(m['chapitres']as List).map<Widget>((ch)=>ExpansionTile(title:Text(ch['titre']),children:(ch['ressources']as List).map<Widget>((r)=>ListTile(enabled:r['verrouille']!=true,title:Text(r['titre']),leading:Icon(r['type']=='PDF'?Icons.picture_as_pdf:Icons.play_circle),onTap:()=>open(ch['id'],r))).toList())).toList()))]);}));
}
class ClassesPage extends StatelessWidget{const ClassesPage({super.key});@override Widget build(BuildContext c)=>FutureBuilder(future:ApiClient().call('/participant/classes'),builder:(c,s){if(s.hasError)return ErrorView(s.error);if(!s.hasData)return const Center(child:CircularProgressIndicator());final items=s.data as List;if(items.isEmpty)return const Center(child:Text('Aucune classe affectée.'));return ListView(children:items.expand<Widget>((cl)=>[ListTile(title:Text(cl['nom']),subtitle:Text(cl['formation'])),...(cl['seances']as List).map((x)=>ListTile(leading:const Icon(Icons.video_call),title:Text(x['titre']),subtitle:Text(x['dateDebut']),onTap:()async{try{final j=await ApiClient().call('/participant/seances/${x['id']}/join');await launchUrl(Uri.parse(j['joinUrl']),mode:LaunchMode.externalApplication);}catch(e){if(c.mounted)ScaffoldMessenger.of(c).showSnackBar(SnackBar(content:Text(e is ApiError?e.message:'Séance inaccessible.')));}}))]).toList());});}
class ErrorView extends StatelessWidget{final Object?error;const ErrorView(this.error,{super.key});@override Widget build(BuildContext c)=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Text(error is ApiError?(error as ApiError).message:'Impossible de charger les données.')));}
