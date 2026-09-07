import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CourseCard, levelLabel} from "@/components/CourseCard";
import {KnowledgePath} from "@/components/KnowledgePath";
import {MagneticLink} from "@/components/MagneticLink";
import type {CatalogueItem} from "@/lib/learning";

vi.mock("@/components/FavoriteButton", () => ({FavoriteButton: () => <button>Favori</button>}));
vi.mock("next/image", () => ({default: () => <span data-testid="course-image" />}));

describe("interactions visuelles accessibles", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({matches: false})));
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("anime une carte de cours et restitue ses offres", () => {
    const course: CatalogueItem={id:7,titre:"Architecture",description:"Cours pratique",imageUrl:"cover.jpg",langue:"fr",niveau:"AVANCE",categorie:"Java",prix:0,supplementClasses:25,prixAvecClasses:25,offreClasses:true,classeActive:true,formateur:"Sara",nombreModules:4,nombreChapitres:8};
    const {container}=render(<CourseCard course={course}/>);
    const card=container.querySelector("article")!;
    vi.spyOn(card,"getBoundingClientRect").mockReturnValue({left:0,top:0,width:200,height:100,right:200,bottom:100,x:0,y:0,toJSON:()=>({})});
    fireEvent.pointerMove(card,{pointerType:"mouse",clientX:150,clientY:25});
    expect(card).toHaveStyle({"--tilt-x":"0.60deg","--tilt-y":"0.60deg"});
    fireEvent.pointerLeave(card,{pointerType:"mouse"});
    expect(card).toHaveStyle({"--tilt-x":"0deg","--tilt-y":"0deg"});
    expect(screen.getByText("Gratuite")).toBeInTheDocument();
    expect(screen.getByText(/Classe active · \+25 DH/)).toBeInTheDocument();
    expect(levelLabel("TRES_AVANCE")).toBe("Tres avance");
  });

  it("déplace le focus et le halo du parcours de connaissance", () => {
    const {container}=render(<KnowledgePath active={2} label="Progression"/>);
    const path=screen.getByRole("list",{name:"Progression"});
    vi.spyOn(path,"getBoundingClientRect").mockReturnValue({left:10,top:20,width:500,height:100,right:510,bottom:120,x:10,y:20,toJSON:()=>({})});
    fireEvent.pointerMove(path,{pointerType:"mouse",clientX:80,clientY:60});
    expect(path).toHaveClass("pointer-active");
    expect(path).toHaveStyle({"--pointer-x":"70px","--pointer-y":"40px"});
    fireEvent.pointerLeave(path);
    expect(path).not.toHaveClass("pointer-active");
    const buttons=screen.getAllByRole("button");
    buttons[2].focus();fireEvent.keyDown(buttons[2],{key:"ArrowRight"});expect(buttons[3]).toHaveFocus();
    fireEvent.keyDown(buttons[3],{key:"Home"});expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(buttons[0],{key:"End"});expect(buttons[4]).toHaveFocus();
    expect(container.querySelectorAll("li.complete")).toHaveLength(2);
  });

  it("borne puis réinitialise le déplacement d'un lien magnétique", () => {
    render(<MagneticLink href="/catalogue">Catalogue</MagneticLink>);
    const link=screen.getByRole("link",{name:"Catalogue"});
    vi.spyOn(link,"getBoundingClientRect").mockReturnValue({left:0,top:0,width:100,height:40,right:100,bottom:40,x:0,y:0,toJSON:()=>({})});
    fireEvent.pointerMove(link,{pointerType:"mouse",clientX:200,clientY:-20});
    expect(link).toHaveStyle({"--magnetic-x":"3.00px","--magnetic-y":"-3.00px"});
    fireEvent.pointerLeave(link);
    expect(link).toHaveStyle({"--magnetic-x":"0px","--magnetic-y":"0px"});
  });
});
